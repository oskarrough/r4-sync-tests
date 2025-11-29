import {createCollection} from '@tanstack/svelte-db'
import {localStorageCollectionOptions} from '@tanstack/db'
import {queryCollectionOptions, parseLoadSubsetOptions} from '@tanstack/query-db-collection'
import {QueryClient} from '@tanstack/svelte-query'
import {startOfflineExecutor, IndexedDBAdapter, NonRetriableError} from '@tanstack/offline-transactions'
import {sdk} from '@radio4000/sdk'
import {appState} from '$lib/app-state.svelte'
import type {PendingMutation} from '@tanstack/db'
import {logger} from '$lib/logger'
import {fetchAllChannels} from '$lib/api/seed'
import {extractYouTubeId} from '$lib/utils'

const log = logger.ns('tanstack').seal()
const txLog = logger.ns('tanstack.tx').seal()
const offlineLog = logger.ns('tanstack.offline').seal()

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24 // 24 hours - must match persistence maxAge
		}
	}
})

// Track metadata collection - local-only cache for YouTube/MusicBrainz/Discogs enrichment
// No server sync needed, persists to localStorage, syncs across tabs
export interface TrackMeta {
	ytid: string
	duration?: number
	youtube_data?: object
	musicbrainz_data?: object
	discogs_data?: object
}

export const trackMetaCollection = createCollection<TrackMeta, string>(
	localStorageCollectionOptions({
		storageKey: 'r5-track-meta',
		getKey: (item) => item.ytid
	})
)

// Play history collection - local-only, persists to localStorage
export interface PlayHistoryEntry {
	id: string
	track_id: string
	slug: string
	title: string
	url: string
	started_at: string
	ended_at?: string
	ms_played: number
	reason_start?: string
	reason_end?: string
	shuffle: boolean
	skipped: boolean
}

export const playHistoryCollection = createCollection<PlayHistoryEntry, string>(
	localStorageCollectionOptions({
		storageKey: 'r5-play-history',
		getKey: (item) => item.id
	})
)

// Channels collection - fetch all, filter locally
export const channelsCollection = createCollection(
	queryCollectionOptions({
		queryKey: () => ['channels'],
		syncMode: 'on-demand',
		queryClient,
		getKey: (item) => item.id,
		staleTime: 10 * 1000, // 10s for testing (maxAge=60s in persistence)
		queryFn: async () => {
			log.info('channels queryFn (fetch all)')
			return fetchAllChannels()
		}
	})
)

// Tracks collection - NO mutation hooks, mutations go through offline actions
export const tracksCollection = createCollection(
	queryCollectionOptions({
		queryKey: (opts) => {
			const options = parseLoadSubsetOptions(opts)
			// Only slug in key - created_at filters are for incremental sync, not cache identity
			const slug = options.filters.find((f) => f.field[0] === 'slug' && f.operator === 'eq')?.value
			return slug ? ['tracks', slug] : ['tracks']
		},
		syncMode: 'on-demand',
		queryClient,
		getKey: (item) => item.id,
		staleTime: 20 * 1000,
		queryFn: async (ctx) => {
			const options = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)
			const slug = options.filters.find((f) => f.field[0] === 'slug' && f.operator === 'eq')?.value
			const createdAfter = options.filters.find((f) => f.field[0] === 'created_at' && f.operator === 'gt')?.value
			log.info('tracks queryFn', {slug, limit: options.limit})
			if (!slug) return []

			// Lookup channel to route by source
			const channel = [...channelsCollection.state.values()].find((ch) => ch.slug === slug)

			if (channel?.source === 'v1') {
				log.info('tracks fetch v1', {slug})
				const {data, error} = await sdk.firebase.readTracks({slug})
				if (error) throw error
				return (data || []).map((t) => sdk.firebase.parseTrack(t, channel.id, slug))
			}

			// V2: use Supabase
			log.info('tracks fetch v2', {slug, limit: options.limit, createdAfter})
			let query = sdk.supabase
				.from('channel_tracks')
				.select('*')
				.eq('slug', slug)
				.order('created_at', {ascending: false})
			if (options.limit) query = query.limit(options.limit)
			if (createdAfter) query = query.gt('created_at', createdAfter)

			const {data, error} = await query
			if (error) throw error

			// Fallback to v1 if v2 returns empty (race condition: channel not loaded yet)
			if (!data?.length) {
				log.info('tracks fetch v1 fallback', {slug})
				const {data: v1Data, error: v1Error} = await sdk.firebase.readTracks({slug})
				if (v1Error) throw v1Error
				if (v1Data?.length) {
					// Need channel id for parsing - look it up or generate deterministic one
					const ch = [...channelsCollection.state.values()].find((c) => c.slug === slug)
					const channelId = ch?.id || slug
					return v1Data.map((t) => sdk.firebase.parseTrack(t, channelId, slug))
				}
			}

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

const tracksAPI = {
	async syncTracks({
		transaction,
		idempotencyKey
	}: {
		transaction: {mutations: Array<PendingMutation>; metadata?: Record<string, unknown>}
		idempotencyKey: string
	}) {
		if (completedIdempotencyKeys.has(idempotencyKey)) {
			txLog.info('tracks skip duplicate', {key: idempotencyKey.slice(0, 8)})
			return
		}

		const slug = transaction.metadata?.slug as string
		for (const mutation of transaction.mutations) {
			txLog.info('tracks', {type: mutation.type, slug, key: idempotencyKey.slice(0, 8)})
			const handler = mutationHandlers[mutation.type]
			if (handler) {
				await handler(mutation, transaction.metadata || {})
			} else {
				txLog.warn('tracks unhandled type', {type: mutation.type})
			}
		}
		// Mark as completed only after all mutations succeeded
		completedIdempotencyKeys.add(idempotencyKey)
		log.info('tx_complete', {idempotencyKey: idempotencyKey.slice(0, 8), slug})

		// Invalidate to sync state after all mutations
		if (slug) {
			log.info('invalidate', {slug})
			await queryClient.invalidateQueries({queryKey: ['tracks', slug]})
		}
	}
}

export const offlineExecutor = startOfflineExecutor({
	onTransactionComplete: (tx) => offlineLog.info('complete', {id: tx.id.slice(0, 8)}),
	onTransactionError: (tx, err) => offlineLog.error('error', {id: tx.id.slice(0, 8), err}),
	collections: {tracks: tracksCollection, channels: channelsCollection},
	storage: new IndexedDBAdapter('r5-offline-mutations', 'transactions'),
	mutationFns: {
		syncTracks: tracksAPI.syncTracks,
		syncChannels: channelsAPI.syncChannels
	},
	onLeadershipChange: (isLeader) => offlineLog.info('leader', {isLeader}),
	onStorageFailure: (diagnostic) => offlineLog.warn('storage failed', diagnostic)
})

// Ensure persistence is loaded (query cache to IDB)
export async function initCollections() {
	await import('./persistence')
}

// Track actions - standalone functions, pass channel each time
type Channel = {id: string; slug: string; source?: 'v1' | 'v2'; firebase_id?: string}

export function addTrack(channel: Channel, input: {url: string; title: string; description?: string}) {
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
			description: input.description || '',
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

/**
 * Get track with metadata merged from trackMetaCollection
 */
export function getTrackWithMeta<T extends {url?: string}>(track: T): T & Partial<TrackMeta> {
	const ytid = extractYouTubeId(track.url)
	if (!ytid) return track
	const meta = trackMetaCollection.get(ytid)
	if (!meta) return track
	return {...track, ...meta}
}

// Play history actions
export function addPlayHistoryEntry(
	track: {id: string; slug: string; title: string; url: string},
	opts: {reason_start?: string; shuffle?: boolean}
) {
	playHistoryCollection.insert({
		id: crypto.randomUUID(),
		track_id: track.id,
		slug: track.slug,
		title: track.title,
		url: track.url,
		started_at: new Date().toISOString(),
		ms_played: 0,
		reason_start: opts.reason_start,
		shuffle: opts.shuffle ?? false,
		skipped: false
	})
}

export function endPlayHistoryEntry(
	trackId: string,
	opts: {ms_played: number; reason_end?: string; skipped?: boolean}
) {
	const entries = [...playHistoryCollection.state.values()]
	const entry = entries.find((e) => e.track_id === trackId && !e.ended_at)
	if (!entry) return

	playHistoryCollection.update(entry.id, (draft) => {
		draft.ended_at = new Date().toISOString()
		draft.ms_played = opts.ms_played
		draft.reason_end = opts.reason_end
		draft.skipped = opts.skipped ?? false
	})
}

export function clearPlayHistory() {
	for (const id of playHistoryCollection.state.keys()) {
		playHistoryCollection.delete(id)
	}
}
