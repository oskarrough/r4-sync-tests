/**
 * Direct collection persistence to IndexedDB.
 *
 * Bypasses TanStack Query cache persistence to avoid the on-demand sync bug
 * where functions in query meta can't survive serialization.
 *
 * See plan-data-flow-bug.md for details.
 */
import {browser} from '$app/environment'
import {get, set} from 'idb-keyval'
import {tracksCollection} from './collections/tracks'
import {channelsCollection} from './collections/channels'
import {logger} from '$lib/logger'

const log = logger.ns('collection-persistence').seal()

const IDB_KEYS = {
	tracks: 'r5-collections-tracks',
	channels: 'r5-collections-channels'
} as const

type CollectionLike<T> = {
	state: Map<string, T>
}

/** Restore collection data from IDB using direct state.set() to bypass sync layer */
async function hydrateCollection<T extends {id: string}>(
	collection: CollectionLike<T>,
	idbKey: string,
	name: string
): Promise<number> {
	let data: T[] | undefined
	try {
		data = await get<T[]>(idbKey)
	} catch (err) {
		log.debug('hydrate idb error', {name, error: err})
		return 0
	}

	if (!data?.length) {
		log.debug('hydrate empty', {name})
		return 0
	}

	log.debug('hydrate start', {name, count: data.length})
	for (const item of data) {
		collection.state.set(item.id, item)
	}
	log.debug('hydrate done', {name, count: data.length})
	return data.length
}

/** Persist collection data to IDB (debounced) */
function persistCollection<T extends {id: string}>(collection: CollectionLike<T>, idbKey: string, name: string): void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null
	let lastSize = collection.state.size

	const save = () => {
		const data = [...collection.state.values()]
		if (data.length === 0) {
			log.debug('persist skip empty', {name})
			return
		}
		log.debug('persist', {name, count: data.length})
		set(idbKey, data).catch((err) => log.warn('persist error', {name, error: err}))
	}

	// Poll for changes every 2 seconds, debounce actual writes
	setInterval(() => {
		const currentSize = collection.state.size
		if (currentSize !== lastSize) {
			lastSize = currentSize
			if (timeoutId) clearTimeout(timeoutId)
			timeoutId = setTimeout(save, 1000)
		}
	}, 2000)

	// Save on page unload
	if (typeof window !== 'undefined') {
		window.addEventListener('beforeunload', save)
	}

	// Initial save after a delay (for fresh data)
	setTimeout(() => {
		if (collection.state.size > 0 && collection.state.size !== lastSize) {
			lastSize = collection.state.size
			save()
		}
	}, 5000)
}

/** Promise that resolves when collections are hydrated from IDB */
export const collectionsHydrated: Promise<void> = browser
	? (async () => {
			try {
				const [tracksCount, channelsCount] = await Promise.all([
					hydrateCollection(tracksCollection, IDB_KEYS.tracks, 'tracks'),
					hydrateCollection(channelsCollection, IDB_KEYS.channels, 'channels')
				])
				log.info('hydrated', {tracks: tracksCount, channels: channelsCount})

				// Start persisting changes after hydration
				persistCollection(tracksCollection, IDB_KEYS.tracks, 'tracks')
				persistCollection(channelsCollection, IDB_KEYS.channels, 'channels')
			} catch (err) {
				log.warn('hydration error', {error: err})
			}
		})()
	: Promise.resolve()
