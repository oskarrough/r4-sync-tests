import {createCollection} from '@tanstack/svelte-db'
import {queryCollectionOptions, parseLoadSubsetOptions} from '@tanstack/query-db-collection'
import {QueryClient} from '@tanstack/svelte-query'
import {startOfflineExecutor, IndexedDBAdapter} from '@tanstack/offline-transactions'
import {sdk} from '@radio4000/sdk'
import type {PendingMutation} from '@tanstack/db'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24 // 24 hours
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
			console.log('tracks.queryFn', {slug, limit, createdAfter})
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
			switch (mutation.type) {
				case 'insert': {
					const track = mutation.modified as {id: string; url: string; title: string}
					const channelId = transaction.metadata?.channelId as string
					if (!channelId) throw new Error('channelId required in transaction metadata')
					const {data, error} = await sdk.tracks.createTrack(channelId, track)
					if (error) throw new Error(error.message || JSON.stringify(error))
					console.log('syncTracks insert success', {data})
					break
				}
				case 'update': {
					const track = mutation.modified as {id: string}
					const {error} = await sdk.tracks.updateTrack(track.id, mutation.changes)
					if (error) throw new Error(error.message || JSON.stringify(error))
					break
				}
				case 'delete': {
					const track = mutation.original as {id: string}
					const {error} = await sdk.tracks.deleteTrack(track.id)
					if (error) throw new Error(error.message || JSON.stringify(error))
					break
				}
			}
		}
		// Mark as completed only after all mutations succeeded
		completedIdempotencyKeys.add(idempotencyKey)

		// Invalidate to sync state after all mutations
		if (slug) {
			await queryClient.invalidateQueries({queryKey: ['tracks', `slug-eq-${slug}`]})
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

// Offline actions - components call these instead of collection.insert() directly
export function createTrackActions(executor: typeof offlineExecutor, channelId: string, slug: string) {
	const addTrack = (input: {url: string; title: string}) => {
		const tx = executor.createOfflineTransaction({
			mutationFnName: 'syncTracks',
			metadata: {channelId, slug},
			autoCommit: false
		})
		tx.mutate(() => {
			const newTrack = {
				id: crypto.randomUUID(),
				url: input.url,
				title: input.title,
				slug,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}
			tracksCollection.insert(newTrack)
		})
		return tx.commit()
	}

	const updateTrack = (input: {id: string; changes: Record<string, unknown>}) => {
		const tx = executor.createOfflineTransaction({
			mutationFnName: 'syncTracks',
			metadata: {channelId, slug},
			autoCommit: false
		})
		tx.mutate(() => {
			const track = tracksCollection.get(input.id)
			if (!track) return
			tracksCollection.update(input.id, (draft) => {
				Object.assign(draft, input.changes, {updated_at: new Date().toISOString()})
			})
		})
		return tx.commit()
	}

	const deleteTrack = (id: string) => {
		const tx = executor.createOfflineTransaction({
			mutationFnName: 'syncTracks',
			metadata: {channelId, slug},
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

	return {addTrack, updateTrack, deleteTrack}
}
