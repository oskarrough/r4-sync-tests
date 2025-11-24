import {createCollection} from '@tanstack/svelte-db'
import {queryCollectionOptions, parseLoadSubsetOptions} from '@tanstack/query-db-collection'
import {QueryClient} from '@tanstack/svelte-query'
import {sdk} from '@radio4000/sdk'

const queryClient = new QueryClient()

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
		// staleTime: 5 * 60 * 1000, // 5 minutes
		queryFn: async (ctx) => {
			const {filters, limit} = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)
			const slug = filters.find((f) => f.field.includes('slug') && f.operator === 'eq')?.value
			const {data, error} = await sdk.channels.readChannelTracks(slug, limit)
			if (error) throw error
			return data
		},
		queryClient,
		getKey: (item) => item.id

		// @todo once above works
		// onInsert,
		// onUpdate,
		// onDelete
	})
)

// Progressive channels collection: loads query subset immediately, then syncs full dataset in background
export const channelsCollection = createCollection(
	queryCollectionOptions({
		queryKey: ['channels'],
		// syncMode: 'progressive',
		syncMode: 'on-demand',
		staleTime: 5 * 60 * 1000, // 5 minutes
		queryFn: async (ctx) => {
			const {filters, sorts, limit} = parseLoadSubsetOptions(ctx.meta.loadSubsetOptions)
			console.log('Fetching channels', filters, sorts, limit)

			const slug = filters.find((f) => f.field.includes('slug') && f.operator === 'eq')?.value
			if (slug) {
				const {data, error} = await sdk.channels.readChannel(slug)
				if (error) throw error
				return data
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
