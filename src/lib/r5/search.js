import {searchAll, searchChannels, searchTracks} from '../search.js'
import {getPg} from './db.js'

/** Search all content */
export async function all(query) {
	// Ensure pg is initialized for search.js
	await getPg()
	return searchAll(query)
}

/** Search channels only */
export async function channels(query) {
	// Ensure pg is initialized for search.js
	await getPg()
	return searchChannels(query)
}

/** Search tracks only */
export async function tracks(query) {
	// Ensure pg is initialized for search.js
	await getPg()
	return searchTracks(query)
}
