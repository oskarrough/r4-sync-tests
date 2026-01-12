import {createCollection} from '@tanstack/svelte-db'
import {localStorageCollectionOptions} from '@tanstack/db'
import {NonRetriableError} from '@tanstack/offline-transactions'
import {sdk} from '@radio4000/sdk'
import {appState} from '$lib/app-state.svelte'
import type {PendingMutation} from '@tanstack/db'
import {log, txLog, getErrorMessage} from './utils'
import {getOfflineExecutor} from './offline-executor'

// v1 follows can't sync to remote due to FK constraint - stored locally only
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

function shouldSyncFollow(follow: Follow): string | false {
	return (follow.source !== 'v1' && appState.channels?.[0]) || false
}

async function handleFollowInsert(mutation: PendingMutation): Promise<void> {
	const follow = mutation.modified as unknown as Follow
	const userChannelId = shouldSyncFollow(follow)
	if (!userChannelId) return
	const {error} = await sdk.channels.followChannel(userChannelId, follow.channelId)
	if (error) throw new NonRetriableError(getErrorMessage(error))
}

async function handleFollowDelete(mutation: PendingMutation): Promise<void> {
	const follow = mutation.original as unknown as Follow
	const userChannelId = shouldSyncFollow(follow)
	if (!userChannelId) return
	const {error} = await sdk.channels.unfollowChannel(userChannelId, follow.channelId)
	if (error) throw new NonRetriableError(getErrorMessage(error))
}

export const followsAPI = {
	async syncFollows({
		transaction,
		idempotencyKey
	}: {
		transaction: {mutations: Array<PendingMutation>; metadata?: Record<string, unknown>}
		idempotencyKey: string
	}) {
		for (const mutation of transaction.mutations) {
			txLog.info('follows', {type: mutation.type, key: idempotencyKey.slice(0, 8)})
			if (mutation.type === 'insert') await handleFollowInsert(mutation)
			else if (mutation.type === 'delete') await handleFollowDelete(mutation)
			else txLog.warn('follows unhandled type', {type: mutation.type})
		}
		log.info('follows_tx_complete', {idempotencyKey: idempotencyKey.slice(0, 8)})
	}
}

export async function pullFollows(userChannelId: string) {
	const {data, error} = await sdk.channels.readFollowings(userChannelId)
	if (error) {
		log.error('pull_follows_error', {userChannelId, error})
		return
	}
	for (const ch of data || []) {
		if (!followsCollection.state.has(ch.id)) {
			followsCollection.insert({channelId: ch.id, createdAt: ch.created_at, source: 'v2'})
		}
	}
}

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
