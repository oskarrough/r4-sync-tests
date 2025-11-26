import {createCollection} from '@tanstack/svelte-db'
import {queryCollectionOptions, parseLoadSubsetOptions} from '@tanstack/query-db-collection'
import {QueryClient} from '@tanstack/svelte-query'
import {persistQueryClient} from '@tanstack/query-persist-client-core'
import {startOfflineExecutor, IndexedDBAdapter} from '@tanstack/offline-transactions'
import {get, set, del} from 'idb-keyval'
import {sdk} from '@radio4000/sdk'
import type {PersistedClient, Persister} from '@tanstack/query-persist-client-core'
import type {PendingMutation} from '@tanstack/db'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24 // 24 hours
		}
	}
})

// Cycle-safe JSON serialization
function safeStringify(obj: unknown): string {
	const seen = new WeakSet()
	return JSON.stringify(obj, (_key, value) => {
		if (typeof value === 'object' && value !== null) {
			if (seen.has(value)) return undefined
			seen.add(value)
		}
		if (typeof value === 'function') return undefined
		return value
	})
}

// IDB persister for query cache
const idbPersister: Persister = {
	persistClient: async (client: PersistedClient) => {
		await set('r5-tanstack-query', safeStringify(client))
	},
	restoreClient: async () => {
		const data = await get<string>('r5-tanstack-query')
		return data ? JSON.parse(data) : undefined
	},
	removeClient: async () => {
		await del('r5-tanstack-query')
	}
}

persistQueryClient({queryClient, persister: idbPersister})

// Tracks collection - NO mutation hooks, mutations go through offline actions
export const tracksCollection = createCollection(
	queryCollectionOptions({
		queryKey: (opts) => {
			const parsed = parseLoadSubsetOptions(opts)
			const cacheKey = ['tracks']
			parsed.filters.forEach((f) => {
				cacheKey.push(`${f.field.join('.')}-${f.operator}-${f.value}`)
			})
			if (parsed.limit) {
				cacheKey.push(`limit-${parsed.limit}`)
			}
			return cacheKey
		},
		syncMode: 'on-demand',
		queryClient,
		getKey: (item) => item.id,
		staleTime: 1 * 60 * 1000,
		queryFn: async (ctx) => {
			const {filters, limit} = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)
			const slug = filters.find((f) => f.field.includes('slug') && f.operator === 'eq')?.value
			console.log('tracks.queryFn', {slug, limit})
			if (!slug) return []
			const {data, error} = await sdk.channels.readChannelTracks(slug, limit)
			if (error) throw error
			return data || []
		}
	})
)

// Channels collection
export const channelsCollection = createCollection(
	queryCollectionOptions({
		queryKey: (opts) => {
			const parsed = parseLoadSubsetOptions(opts)
			const cacheKey = ['channels']
			parsed.filters.forEach((f) => {
				cacheKey.push(`${f.field.join('.')}-${f.operator}-${f.value}`)
			})
			if (parsed.limit) {
				cacheKey.push(`limit-${parsed.limit}`)
			}
			return cacheKey
		},
		syncMode: 'on-demand',
		staleTime: 5 * 60 * 1000,
		queryFn: async (ctx) => {
			const {filters, limit} = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)
			console.log('channels.queryFn', {filters, limit})
			const slug = filters.find((f) => f.field.includes('slug') && f.operator === 'eq')?.value
			if (slug) {
				const {data, error} = await sdk.channels.readChannel(slug)
				if (error) throw error
				return data ? [data] : []
			}
			const {data, error} = await sdk.channels.readChannels()
			if (error) throw error
			return data || []
		},
		queryClient,
		getKey: (item) => item.id
	})
)

// API sync function - handles all track mutations
const tracksAPI = {
	async syncTracks({transaction}: {transaction: {mutations: Array<PendingMutation>}; idempotencyKey: string}) {
		for (const mutation of transaction.mutations) {
			console.log('syncTracks', mutation.type, mutation)
			switch (mutation.type) {
				case 'insert': {
					const track = mutation.modified as {id: string; url: string; title: string; channel_id?: string}
					const channelId = track.channel_id
					if (!channelId) throw new Error('channel_id required')
					const {error} = await sdk.tracks.createTrack(channelId, track)
					if (error) throw new Error(error.message || JSON.stringify(error))
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
		await tracksCollection.utils.refetch()
	}
}

// Create offline executor
export const offlineExecutor = startOfflineExecutor({
	collections: {tracks: tracksCollection, channels: channelsCollection},
	storage: new IndexedDBAdapter('r5-offline', 'transactions'),
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
export function createTrackActions(executor: typeof offlineExecutor, channelId: string) {
	const addTrack = executor.createOfflineAction({
		mutationFnName: 'syncTracks',
		onMutate: (input: {url: string; title: string}) => {
			const newTrack = {
				id: crypto.randomUUID(),
				url: input.url,
				title: input.title,
				channel_id: channelId,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}
			tracksCollection.insert(newTrack)
			return newTrack
		}
	})

	const updateTrack = executor.createOfflineAction({
		mutationFnName: 'syncTracks',
		onMutate: (input: {id: string; changes: Record<string, unknown>}) => {
			const track = tracksCollection.get(input.id)
			if (!track) return
			tracksCollection.update(input.id, (draft) => {
				Object.assign(draft, input.changes, {updated_at: new Date().toISOString()})
			})
			return track
		}
	})

	const deleteTrack = executor.createOfflineAction({
		mutationFnName: 'syncTracks',
		onMutate: (id: string) => {
			const track = tracksCollection.get(id)
			if (track) {
				tracksCollection.delete(id)
			}
			return track
		}
	})

	return {addTrack, updateTrack, deleteTrack}
}
