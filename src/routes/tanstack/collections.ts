import {createCollection} from '@tanstack/svelte-db'
import {queryCollectionOptions, parseLoadSubsetOptions} from '@tanstack/query-db-collection'
import {QueryClient} from '@tanstack/svelte-query'
import {startOfflineExecutor, IndexedDBAdapter, NonRetriableError} from '@tanstack/offline-transactions'
import {sdk} from '@radio4000/sdk'
import {appState} from '$lib/app-state.svelte'
import type {PendingMutation} from '@tanstack/db'
import {logger} from '$lib/logger'

const log = logger.ns('tanstack').seal()

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24 // 24 hours - must match persistence maxAge
		}
	}
})

// Channels collection (mutation functions are in "offline actions")
export const channelsCollection = createCollection(
	queryCollectionOptions({
		queryKey: (opts) => {
			const parsed = parseLoadSubsetOptions(opts)
			const slug = parsed.filters.find((f) => f.field[0] === 'slug' && f.operator === 'eq')?.value
			const id = parsed.filters.find((f) => f.field[0] === 'id' && f.operator === 'eq')?.value
			if (slug) return ['channels', 'slug', slug]
			if (id) return ['channels', 'id', id]
			return ['channels']
		},
		syncMode: 'on-demand',
		queryClient,
		getKey: (item) => item.id,
		staleTime: 0,
		queryFn: async (ctx) => {
			const {filters, limit} = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)
			const slug = filters.find((f) => f.field[0] === 'slug' && f.operator === 'eq')?.value
			const id = filters.find((f) => f.field[0] === 'id' && f.operator === 'eq')?.value
			log.info('channels queryFn', {slug, id, limit})

			if (slug) {
				const {data, error} = await sdk.channels.readChannel(slug)
				if (error) throw error
				return data ? [data] : []
			}

			if (id) {
				const {data, error} = await sdk.supabase.from('channels').select('*').eq('id', id).single()
				if (error) throw error
				return data ? [data] : []
			}

			const {data, error} = await sdk.supabase
				.from('channels_with_tracks')
				.select('*')
				.order('created_at', {ascending: false})
				.limit(limit || 50)
			if (error) throw error
			return data || []
		}
	})
)

// Tracks collection - NO mutation hooks, mutations go through offline actions
export const tracksCollection = createCollection(
	queryCollectionOptions({
		queryKey: (opts) => {
			const parsed = parseLoadSubsetOptions(opts)
			// Only slug in key - created_at filters are for incremental sync, not cache identity
			const slug = parsed.filters.find((f) => f.field[0] === 'slug' && f.operator === 'eq')?.value
			return slug ? ['tracks', slug] : ['tracks']
		},
		syncMode: 'on-demand',
		queryClient,
		getKey: (item) => item.id,
		staleTime: 1 * 60 * 1000,
		queryFn: async (ctx) => {
			const {filters, limit} = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)
			const slug = filters.find((f) => f.field[0] === 'slug' && f.operator === 'eq')?.value
			const createdAfter = filters.find((f) => f.field[0] === 'created_at' && f.operator === 'gt')?.value
			log.debug('queryFn', {slug, limit})
			if (!slug) return []

			let query = sdk.supabase
				.from('channel_tracks')
				.select('*')
				.eq('slug', slug)
				.order('created_at', {ascending: false})
			if (limit) query = query.limit(limit)
			if (createdAfter) query = query.gt('created_at', createdAfter)

			const {data, error} = await query
			if (error) throw error
			return data || []
		}
	})
)

// Workaround for https://github.com/TanStack/db/issues/921
// loadAndReplayTransactions is called twice on init, causing duplicate mutations
// Only track SUCCESSFUL completions to allow retries after failures
const completedIdempotencyKeys = new Set<string>()

// Ideally SDK errors would have consistent shape. They don't.
function getErrorMessage(err: unknown): string {
	if (err instanceof Error) return err.message
	if (typeof err === 'string') return err
	if (err && typeof err === 'object' && 'message' in err) return String(err.message)
	return 'Unknown error'
}

// API sync function - handles all track mutations
type MutationHandler = (mutation: PendingMutation, metadata: Record<string, unknown>) => Promise<void>

const mutationHandlers: Record<string, MutationHandler> = {
	insert: async (mutation, metadata) => {
		const track = mutation.modified as {id: string; url: string; title: string}
		const channelId = metadata?.channelId as string
		if (!channelId) throw new NonRetriableError('channelId required in transaction metadata')
		log.info('insert_start', {clientId: track.id, title: track.title, channelId})
		try {
			const {data, error} = await sdk.tracks.createTrack(channelId, track)
			log.info('insert_done', {clientId: track.id, serverId: data?.id, match: track.id === data?.id, error})
			if (error) throw new NonRetriableError(getErrorMessage(error))
		} catch (err) {
			if (err instanceof NonRetriableError) throw err
			throw new NonRetriableError(getErrorMessage(err))
		}
	},
	update: async (mutation) => {
		const track = mutation.modified as {id: string}
		const changes = mutation.changes as Record<string, unknown>
		log.info('update_start', {id: track.id, title: changes.title})
		try {
			const response = await sdk.tracks.updateTrack(track.id, changes)
			log.info('update_done', {
				id: track.id,
				rowsAffected: response.data?.length,
				status: response.status,
				error: response.error
			})
			if (response.error) throw new NonRetriableError(getErrorMessage(response.error))
		} catch (err) {
			if (err instanceof NonRetriableError) throw err
			throw new NonRetriableError(getErrorMessage(err))
		}
	},
	delete: async (mutation) => {
		const track = mutation.original as {id: string}
		log.info('delete_start', {id: track.id})
		try {
			const response = await sdk.tracks.deleteTrack(track.id)
			log.info('delete_done', {id: track.id, status: response.status, error: response.error})
			if (response.error) throw new NonRetriableError(getErrorMessage(response.error))
		} catch (err) {
			if (err instanceof NonRetriableError) throw err
			throw new NonRetriableError(getErrorMessage(err))
		}
	}
}

// Channel mutation handlers
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

const channelsAPI = {
	async syncChannels({
		transaction,
		idempotencyKey
	}: {
		transaction: {mutations: Array<PendingMutation>; metadata?: Record<string, unknown>}
		idempotencyKey: string
	}) {
		if (completedIdempotencyKeys.has(idempotencyKey)) {
			console.log('syncChannels skipping already-completed', {idempotencyKey})
			return
		}

		for (const mutation of transaction.mutations) {
			console.log('syncChannels', mutation.type, mutation, {idempotencyKey})
			const handler = channelMutationHandlers[mutation.type]
			if (handler) {
				await handler(mutation, transaction.metadata || {})
			} else {
				console.warn(`Unhandled channel mutation type: ${mutation.type}`)
			}
		}
		completedIdempotencyKeys.add(idempotencyKey)
		log.info('channel_tx_complete', {idempotencyKey: idempotencyKey.slice(0, 8)})

		await queryClient.invalidateQueries({queryKey: ['channels']})
	}
}

const tracksAPI = {
	async syncTracks({
		transaction,
		idempotencyKey
	}: {
		transaction: {mutations: Array<PendingMutation>; metadata?: Record<string, unknown>}
		idempotencyKey: string
	}) {
		if (completedIdempotencyKeys.has(idempotencyKey)) {
			console.log('syncTracks skipping already-completed', {idempotencyKey})
			return
		}

		const slug = transaction.metadata?.slug as string
		for (const mutation of transaction.mutations) {
			console.log('syncTracks', mutation.type, mutation, {idempotencyKey})
			const handler = mutationHandlers[mutation.type]
			if (handler) {
				await handler(mutation, transaction.metadata || {})
			} else {
				console.warn(`Unhandled mutation type: ${mutation.type}`)
			}
		}
		// Mark as completed only after all mutations succeeded
		completedIdempotencyKeys.add(idempotencyKey)
		log.info('tx_complete', {idempotencyKey: idempotencyKey.slice(0, 8), slug})

		// Invalidate to sync state after all mutations
		if (slug) {
			log.debug('invalidate_start', {slug})
			await queryClient.invalidateQueries({queryKey: ['tracks', slug]})
			log.debug('invalidate_done', {slug})
		}
	}
}

export const offlineExecutor = startOfflineExecutor({
	onTransactionComplete: (tx) => console.log('transaction complete', tx.id),
	onTransactionError: (tx, err) => console.log('transaction error', tx.id, err),
	collections: {tracks: tracksCollection, channels: channelsCollection},
	storage: new IndexedDBAdapter('r5-offline-mutations', 'transactions'),
	mutationFns: {
		syncTracks: tracksAPI.syncTracks,
		syncChannels: channelsAPI.syncChannels
	},
	onLeadershipChange: (isLeader) => {
		console.log('offline executor leadership:', {isLeader})
	},
	onStorageFailure: (diagnostic) => {
		console.warn('offline storage failed:', diagnostic)
	}
})

// Initialize collections - must be awaited before using writeUpsert
export async function initCollections() {
	// Refetch initializes the sync context for on-demand collections
	await channelsCollection.utils.refetch()
}

// Track actions - standalone functions, pass channel each time
type Channel = {id: string; slug: string}

export function addTrack(channel: Channel, input: {url: string; title: string}) {
	const tx = offlineExecutor.createOfflineTransaction({
		mutationFnName: 'syncTracks',
		metadata: {channelId: channel.id, slug: channel.slug},
		autoCommit: false
	})
	tx.mutate(() => {
		tracksCollection.insert({
			id: crypto.randomUUID(),
			url: input.url,
			title: input.title,
			slug: channel.slug,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
	})
	return tx.commit()
}

export function updateTrack(channel: Channel, id: string, changes: Record<string, unknown>) {
	const tx = offlineExecutor.createOfflineTransaction({
		mutationFnName: 'syncTracks',
		metadata: {channelId: channel.id, slug: channel.slug},
		autoCommit: false
	})
	tx.mutate(() => {
		const track = tracksCollection.get(id)
		if (!track) return
		tracksCollection.update(id, (draft) => {
			Object.assign(draft, changes, {updated_at: new Date().toISOString()})
		})
	})
	return tx.commit()
}

export function deleteTrack(channel: Channel, id: string) {
	const tx = offlineExecutor.createOfflineTransaction({
		mutationFnName: 'syncTracks',
		metadata: {channelId: channel.id, slug: channel.slug},
		autoCommit: false
	})
	tx.mutate(() => {
		const track = tracksCollection.get(id)
		if (track) {
			tracksCollection.delete(id)
		}
	})
	return tx.commit()
}

// Channel actions
export function createChannel(input: {name: string; slug: string; description?: string}) {
	const userId = appState.user?.id
	if (!userId) throw new Error('Must be signed in to create a channel')

	const tx = offlineExecutor.createOfflineTransaction({
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
	const tx = offlineExecutor.createOfflineTransaction({
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
	const tx = offlineExecutor.createOfflineTransaction({
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
