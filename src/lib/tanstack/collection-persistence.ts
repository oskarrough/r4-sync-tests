/** Direct collection persistence to IndexedDB, bypassing TanStack Query cache. */
import {browser} from '$app/environment'
import {get, set} from 'idb-keyval'
import {tracksCollection} from './collections/tracks'
import {channelsCollection} from './collections/channels'
import {logger} from '$lib/logger'

const log = logger.ns('collection-persistence').seal()

const IDB_KEY_TRACKS = 'r5-collections-tracks'
const IDB_KEY_CHANNELS = 'r5-collections-channels'

type CollectionLike<T> = {
	state: Map<string, T>
}

async function hydrateCollection<T extends {id: string}>(
	collection: CollectionLike<T>,
	idbKey: string
): Promise<number> {
	const data = await get<T[]>(idbKey).catch(() => undefined)
	if (!data?.length) return 0

	for (const item of data) {
		collection.state.set(item.id, item)
	}
	return data.length
}

function persistCollection<T extends {id: string}>(collection: CollectionLike<T>, idbKey: string): void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null
	let lastSize = collection.state.size

	const save = () => {
		const data = [...collection.state.values()]
		if (data.length === 0) return
		log.info('persist', {key: idbKey, count: data.length})
		set(idbKey, data).catch((err) => log.warn('persist error', {key: idbKey, error: err}))
	}

	setInterval(() => {
		const currentSize = collection.state.size
		if (currentSize !== lastSize) {
			lastSize = currentSize
			if (timeoutId) clearTimeout(timeoutId)
			timeoutId = setTimeout(save, 1000)
		}
	}, 2000)

	if (typeof window !== 'undefined') {
		window.addEventListener('beforeunload', save)
	}

	setTimeout(() => {
		if (collection.state.size > 0 && collection.state.size !== lastSize) {
			lastSize = collection.state.size
			save()
		}
	}, 5000)
}

// TEMP DISABLED - debugging navigation/data issues
export const collectionsHydrated: Promise<void> = Promise.resolve()

// export const collectionsHydrated: Promise<void> = browser
// 	? (async () => {
// 			const [tracksCount, channelsCount] = await Promise.all([
// 				hydrateCollection(tracksCollection, IDB_KEY_TRACKS),
// 				hydrateCollection(channelsCollection, IDB_KEY_CHANNELS)
// 			]).catch((err) => {
// 				log.warn('hydration error', {error: err})
// 				return [0, 0]
// 			})
//
// 			log.info('hydrated', {tracks: tracksCount, channels: channelsCount})
//
// 			persistCollection(tracksCollection, IDB_KEY_TRACKS)
// 			persistCollection(channelsCollection, IDB_KEY_CHANNELS)
// 		})()
// 	: Promise.resolve()
