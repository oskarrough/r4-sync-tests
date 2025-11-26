import {createCollection} from '@tanstack/svelte-db'
import {queryCollectionOptions, parseLoadSubsetOptions} from '@tanstack/query-db-collection'
import {QueryClient} from '@tanstack/svelte-query'
import {persistQueryClient} from '@tanstack/query-persist-client-core'
import {get, set, del} from 'idb-keyval'
import {sdk} from '@radio4000/sdk'
import type {PersistedClient, Persister} from '@tanstack/query-persist-client-core'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24, // 24 hours
		},
	},
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

// IDB persister for offline cache
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
	},
}

// Restore cache from IDB and subscribe to changes
persistQueryClient({queryClient, persister: idbPersister})

// Create a collection for tracks with on-demand loading. The idea is to have all tracks for all channels in a single collection and you filter them by slug.
export const tracksCollection = createCollection(
	queryCollectionOptions({
		// Dynamic query key based on filters
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
		staleTime: 1 * 60 * 1000, // 1 minutes

		queryFn: async (ctx) => {
			const {filters, limit} = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)
			const slug = filters.find((f) => f.field.includes('slug') && f.operator === 'eq')?.value
			console.log('tracks.queryFn', {slug, limit})
			if (!slug) return []
			const {data, error} = await sdk.channels.readChannelTracks(slug, limit)
			if (error) throw error
			return data || []
		},

		onInsert: async ({transaction}) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					console.log(m)
					const channelId = m.metadata?.channel_id
					if (!channelId) throw new Error('channel_id required in metadata')
					const {error} = await sdk.tracks.createTrack(channelId, m.modified)
					if (error) throw new Error(error.message || JSON.stringify(error))
				})
			)
		},

		onUpdate: async ({transaction}) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const {error} = await sdk.tracks.updateTrack(m.key, m.changes)
					if (error) throw new Error(error.message || JSON.stringify(error))
				})
			)
		},

		onDelete: async ({transaction}) => {
			await Promise.all(
				transaction.mutations.map(async (m) => {
					const {error} = await sdk.tracks.deleteTrack(m.key)
					if (error) throw new Error(error.message || JSON.stringify(error))
				})
			)
		}
	})
)

// Progressive channels collection: loads query subset immediately, then syncs full dataset in background
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
		staleTime: 5 * 60 * 1000, // 5 minutes
		queryFn: async (ctx) => {
			const {filters, sorts, limit} = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)
			console.log('channels.queryFn', {filters, sorts, limit})

			const slug = filters.find((f) => f.field.includes('slug') && f.operator === 'eq')?.value
			if (slug) {
				const {data, error} = await sdk.channels.readChannel(slug)
				if (error) throw error
				return data ? [data] : []
			}

			// Otherwise, fetch all channels for background sync
			const {data, error} = await sdk.channels.readChannels()
			if (error) throw error
			return data || []
		},
		queryClient,
		getKey: (item) => item.id
	})
)
