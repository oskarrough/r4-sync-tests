import {createCollection} from '@tanstack/svelte-db'
import {queryCollectionOptions} from '@tanstack/query-db-collection'
import {NonRetriableError} from '@tanstack/offline-transactions'
import {sdk} from '@radio4000/sdk'
import {appState} from '$lib/app-state.svelte'
import type {PendingMutation} from '@tanstack/db'
import {fetchAllChannels} from '$lib/api/seed'
import {queryClient} from './query-client'
import {log, txLog, completedIdempotencyKeys, getErrorMessage} from './utils'
import {getOfflineExecutor} from './offline-executor'

export type Channel = {id: string; slug: string; source?: 'v1' | 'v2'; firebase_id?: string}

// Channels collection - fetch all, filter locally
export const channelsCollection = createCollection(
	queryCollectionOptions({
		queryKey: () => ['channels'],
		syncMode: 'on-demand',
		queryClient,
		getKey: (item) => item.id,
		staleTime: 24 * 60 * 60 * 1000, // 24h - channels rarely change
		queryFn: async () => {
			log.info('channels queryFn (fetch all)')
			return fetchAllChannels()
		}
	})
)

type MutationHandler = (mutation: PendingMutation, metadata: Record<string, unknown>) => Promise<void>

const channelMutationHandlers: Record<string, MutationHandler> = {
	insert: async (mutation) => {
		const channel = mutation.modified as {id: string; name: string; slug: string; user_id: string}
		if (!channel) throw new NonRetriableError('Invalid mutation: missing modified data')
		log.info('channel_insert_start', {id: channel.id, name: channel.name})
		try {
			// SDK expects userId (camelCase), we store user_id (snake_case)
			const {data, error} = await sdk.channels.createChannel({
				id: channel.id,
				name: channel.name,
				slug: channel.slug,
				userId: channel.user_id
			})
			log.info('channel_insert_done', {clientId: channel.id, serverId: data?.id, error})
			if (error) throw new NonRetriableError(getErrorMessage(error))
			// Add server ID to user's channels list
			if (data?.id) {
				appState.channels = [...(appState.channels || []), data.id]
			}
		} catch (err) {
			if (err instanceof NonRetriableError) throw err
			throw new NonRetriableError(getErrorMessage(err))
		}
	},
	update: async (mutation) => {
		const channel = mutation.modified as {id: string}
		const changes = mutation.changes as Record<string, unknown>
		log.info('channel_update_start', {id: channel.id, changes})
		try {
			const response = await sdk.channels.updateChannel(channel.id, changes)
			log.info('channel_update_done', {id: channel.id, error: response.error})
			if (response.error) throw new NonRetriableError(getErrorMessage(response.error))
		} catch (err) {
			if (err instanceof NonRetriableError) throw err
			throw new NonRetriableError(getErrorMessage(err))
		}
	},
	delete: async (mutation) => {
		const channel = mutation.original as {id: string}
		log.info('channel_delete_start', {id: channel.id})
		try {
			const response = await sdk.channels.deleteChannel(channel.id)
			log.info('channel_delete_done', {id: channel.id, error: response.error})
			if (response.error) throw new NonRetriableError(getErrorMessage(response.error))
		} catch (err) {
			if (err instanceof NonRetriableError) throw err
			throw new NonRetriableError(getErrorMessage(err))
		}
	}
}

export const channelsAPI = {
	async syncChannels({
		transaction,
		idempotencyKey
	}: {
		transaction: {mutations: Array<PendingMutation>; metadata?: Record<string, unknown>}
		idempotencyKey: string
	}) {
		if (completedIdempotencyKeys.has(idempotencyKey)) {
			txLog.debug('channels skip duplicate', {key: idempotencyKey.slice(0, 8)})
			return
		}

		for (const mutation of transaction.mutations) {
			txLog.info('channels', {type: mutation.type, key: idempotencyKey.slice(0, 8)})
			const handler = channelMutationHandlers[mutation.type]
			if (handler) {
				await handler(mutation, transaction.metadata || {})
			} else {
				txLog.warn('channels unhandled type', {type: mutation.type})
			}
		}
		completedIdempotencyKeys.add(idempotencyKey)
		log.info('channel_tx_complete', {idempotencyKey: idempotencyKey.slice(0, 8)})

		await queryClient.invalidateQueries({queryKey: ['channels']})
	}
}

// Channel actions
export function createChannel(input: {name: string; slug: string; description?: string}) {
	const userId = appState.user?.id
	if (!userId) throw new Error('Must be signed in to create a channel')

	const tx = getOfflineExecutor().createOfflineTransaction({
		mutationFnName: 'syncChannels',
		autoCommit: false
	})
	const id = crypto.randomUUID()
	tx.mutate(() => {
		channelsCollection.insert({
			id,
			user_id: userId,
			name: input.name,
			slug: input.slug,
			description: input.description || '',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
	})
	return tx.commit().then(() => ({id, slug: input.slug}))
}

export function updateChannel(id: string, changes: Record<string, unknown>) {
	const tx = getOfflineExecutor().createOfflineTransaction({
		mutationFnName: 'syncChannels',
		autoCommit: false
	})
	tx.mutate(() => {
		const channel = channelsCollection.get(id)
		if (!channel) return
		channelsCollection.update(id, (draft) => {
			Object.assign(draft, changes, {updated_at: new Date().toISOString()})
		})
	})
	return tx.commit()
}

export function deleteChannel(id: string) {
	const tx = getOfflineExecutor().createOfflineTransaction({
		mutationFnName: 'syncChannels',
		autoCommit: false
	})
	tx.mutate(() => {
		const channel = channelsCollection.get(id)
		if (channel) {
			channelsCollection.delete(id)
		}
	})
	return tx.commit()
}
