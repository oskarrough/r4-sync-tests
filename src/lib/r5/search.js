import {performSearch, searchChannels, searchTracks} from '../search.js'
import {getPg} from './db.js'

/** Search all content */
export async function all(query) {
	const pg = await getPg()
	return performSearch(pg, query)
}

/** Search channels only */
export async function channels(query) {
	const pg = await getPg()
	return searchChannels(pg, query)
}

/** Search tracks only */
export async function tracks(query) {
	const pg = await getPg()
	return searchTracks(pg, query)
}
