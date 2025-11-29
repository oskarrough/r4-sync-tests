import {createCollection} from '@tanstack/svelte-db'
import {queryCollectionOptions, parseLoadSubsetOptions} from '@tanstack/query-db-collection'
import {QueryClient} from '@tanstack/svelte-query'
import {startOfflineExecutor, IndexedDBAdapter} from '@tanstack/offline-transactions'
import {sdk} from '@radio4000/sdk'
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

// Tracks collection - NO mutation hooks, mutations go through offline actions
export const tracksCollection = createCollection(
	queryCollectionOptions({
		queryKey: (opts) => {
			const parsed = parseLoadSubsetOptions(opts)
			const cacheKey = ['tracks']
			parsed.filters.forEach((f) => {
				cacheKey.push(`${f.field.join('.')}-${f.operator}-${f.value}`)
			})
			// Limit not in key - all queries for same slug share cache
			return cacheKey
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

// API sync function - handles all track mutations
type MutationHandler = (mutation: PendingMutation, metadata: Record<string, unknown>) => Promise<void>

const mutationHandlers: Record<string, MutationHandler> = {
	insert: async (mutation, metadata) => {
		const track = mutation.modified as {id: string; url: string; title: string}
		const channelId = metadata?.channelId as string
		if (!channelId) throw new Error('channelId required in transaction metadata')
		log.info('insert_start', {clientId: track.id, title: track.title, channelId})
		const {data, error} = await sdk.tracks.createTrack(channelId, track)
		log.info('insert_done', {clientId: track.id, serverId: data?.id, match: track.id === data?.id, error})
		if (error) throw new Error(error.message || JSON.stringify(error))
	},
	update: async (mutation) => {
		const track = mutation.modified as {id: string}
		const changes = mutation.changes as Record<string, unknown>
		log.info('update_start', {id: track.id, title: changes.title})
		const response = await sdk.tracks.updateTrack(track.id, changes)
		log.info('update_done', {
			id: track.id,
			rowsAffected: response.data?.length,
			status: response.status,
			error: response.error
		})
		if (response.error) throw new Error(response.error.message || JSON.stringify(response.error))
	},
	delete: async (mutation) => {
		const track = mutation.original as {id: string}
		log.info('delete_start', {id: track.id})
		const response = await sdk.tracks.deleteTrack(track.id)
		log.info('delete_done', {id: track.id, status: response.status, error: response.error})
		if (response.error) throw new Error(response.error.message || JSON.stringify(response.error))
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
			await queryClient.invalidateQueries({queryKey: ['tracks', `slug-eq-${slug}`]})
			log.debug('invalidate_done', {slug})
		}
	}
}

export const offlineExecutor = startOfflineExecutor({
	onTransactionComplete: (tx) => console.log('transaction complete', tx.id),
	onTransactionError: (tx, err) => console.log('transaction error', tx.id, err),
	collections: {tracks: tracksCollection},
	storage: new IndexedDBAdapter('r5-offline-mutations', 'transactions'),
	mutationFns: {
		syncTracks: tracksAPI.syncTracks
	},
	onLeadershipChange: (isLeader) => {
		console.log('offline executor leadership:', {isLeader})
	},
	onStorageFailure: (diagnostic) => {
		console.warn('offline storage failed:', diagnostic)
	}
})

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
