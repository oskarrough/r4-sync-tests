import {createCollection} from '@tanstack/svelte-db'
import {localStorageCollectionOptions} from '@tanstack/db'
import {NonRetriableError} from '@tanstack/offline-transactions'
import {sdk} from '@radio4000/sdk'
import {appState} from '$lib/app-state.svelte'
import type {PendingMutation} from '@tanstack/db'
import {log, txLog, completedIdempotencyKeys, getErrorMessage} from './utils'
import {getOfflineExecutor} from './offline-executor'

// Follows collection - local-first with offline sync to r4
// Uses localStorage to preserve v1 follows (can't sync to remote due to FK constraint)
export interface Follow {
	channelId: string
	createdAt: string
	source: 'v1' | 'v2'
}

export const followsCollection = createCollection<Follow, string>(
	localStorageCollectionOptions({
		storageKey: 'r5-follows',
		getKey: (item) => item.channelId
	})
)

// Follows mutation handlers - v1 and anonymous users are local-only
const shouldSyncFollow = (follow: Follow) => follow.source !== 'v1' && appState.channels?.[0]

type MutationHandler = (mutation: PendingMutation, metadata: Record<string, unknown>) => Promise<void>

const followsMutationHandlers: Record<string, MutationHandler> = {
	insert: async (mutation) => {
		const follow = mutation.modified as unknown as Follow
		const userChannelId = shouldSyncFollow(follow)
		if (!userChannelId) return

		try {
			await sdk.channels.followChannel(userChannelId, follow.channelId)
		} catch (err) {
			throw new NonRetriableError(getErrorMessage(err))
		}
	},
	delete: async (mutation) => {
		const follow = mutation.original as unknown as Follow
		const userChannelId = shouldSyncFollow(follow)
		if (!userChannelId) return

		try {
			await sdk.channels.unfollowChannel(userChannelId, follow.channelId)
		} catch (err) {
			throw new NonRetriableError(getErrorMessage(err))
		}
	}
}

export const followsAPI = {
	async syncFollows({
		transaction,
		idempotencyKey
	}: {
		transaction: {mutations: Array<PendingMutation>; metadata?: Record<string, unknown>}
		idempotencyKey: string
	}) {
		if (completedIdempotencyKeys.has(idempotencyKey)) {
			txLog.debug('follows skip duplicate', {key: idempotencyKey.slice(0, 8)})
			return
		}

		for (const mutation of transaction.mutations) {
			txLog.info('follows', {type: mutation.type, key: idempotencyKey.slice(0, 8)})
			const handler = followsMutationHandlers[mutation.type]
			if (handler) {
				await handler(mutation, transaction.metadata || {})
			} else {
				txLog.warn('follows unhandled type', {type: mutation.type})
			}
		}
		completedIdempotencyKeys.add(idempotencyKey)
		log.info('follows_tx_complete', {idempotencyKey: idempotencyKey.slice(0, 8)})
	}
}

/** Pull follows from remote, merge into local (preserves v1 follows) */
export async function pullFollows(userChannelId: string) {
	try {
		const {data} = await sdk.channels.readFollowings(userChannelId)
		for (const ch of data || []) {
			if (!followsCollection.state.has(ch.id)) {
				followsCollection.insert({channelId: ch.id, createdAt: ch.created_at, source: 'v2'})
			}
		}
	} catch (err) {
		log.error('pull_follows_error', {userChannelId, err})
	}
}

// Follow actions
export function followChannel(channel: {id: string; source?: 'v1' | 'v2'}) {
	if (followsCollection.state.has(channel.id)) return Promise.resolve()

	const tx = getOfflineExecutor().createOfflineTransaction({mutationFnName: 'syncFollows', autoCommit: false})
	tx.mutate(() =>
		followsCollection.insert({
			channelId: channel.id,
			createdAt: new Date().toISOString(),
			source: channel.source || 'v2'
		})
	)
	return tx.commit()
}

export function unfollowChannel(channelId: string) {
	if (!followsCollection.state.has(channelId)) return Promise.resolve()

	const tx = getOfflineExecutor().createOfflineTransaction({mutationFnName: 'syncFollows', autoCommit: false})
	tx.mutate(() => followsCollection.delete(channelId))
	return tx.commit()
}
