import {get, set} from 'idb-keyval'
import {tracksCollection} from './collections'

const IDB_TRACKS_KEY = 'r5-tracks-collection'

export async function persistTracksToIDB() {
	const tracks = tracksCollection.toArray
	await set(IDB_TRACKS_KEY, tracks)
	console.log('persistTracksToIDB', tracks.length, 'tracks')
}

export async function hydrateTracksFromIDB() {
	const cached = await get<Array<Record<string, unknown>>>(IDB_TRACKS_KEY)
	if (cached?.length) {
		console.log('hydrateTracksFromIDB', cached.length, 'tracks')
		tracksCollection.utils.writeBatch(() => {
			cached.forEach((t) => tracksCollection.utils.writeInsert(t))
		})
	}
}
