import fuzzysort from 'fuzzysort'
import {sdk} from '@radio4000/sdk'
import {channelsCollection, tracksCollection} from '../routes/tanstack/collections'

/**
 * Search channels and tracks using fuzzy matching on tanstack collections,
 * with optional remote search via Supabase FTS.
 */

/**
 * Search channels by name, slug, description
 * @param {string} query - search query
 * @param {{remote?: boolean, limit?: number}} [options]
 * @returns {Promise<Array>} - matching channels sorted by relevance
 */
export async function searchChannels(query, options = {}) {
	const {remote = false, limit = 100} = options

	if (remote) {
		const {data, error} = await sdk.supabase.from('channels').select().textSearch('fts', `'${query}':*`).limit(limit)
		if (error) throw new Error(error.message)
		return data
	}

	const channels = [...channelsCollection.state.values()]
	const results = fuzzysort.go(query, channels, {
		keys: ['name', 'slug', 'description'],
		limit
	})
	return results.map((r) => r.obj)
}

/**
 * Search tracks by title and description
 * @param {string} query - search query
 * @param {{remote?: boolean, limit?: number, channelSlug?: string}} [options]
 * @returns {Promise<Array>} - track results sorted by relevance
 */
export async function searchTracks(query, options = {}) {
	const {remote = false, limit = 100, channelSlug} = options

	if (remote) {
		let q = sdk.supabase.from('channel_tracks').select().textSearch('fts', `'${query}':*`).limit(limit)
		if (channelSlug) {
			q = q.eq('slug', channelSlug)
		}
		const {data, error} = await q
		if (error) throw new Error(error.message)
		return data
	}

	let tracks = [...tracksCollection.state.values()]
	if (channelSlug) {
		tracks = tracks.filter((t) => t.slug === channelSlug)
	}
	const results = fuzzysort.go(query, tracks, {
		keys: ['title', 'description'],
		limit
	})
	return results.map((r) => r.obj)
}

/**
 * Parse mention search query like "@oskar dance" or "@ko002 @oskar house"
 * @param {string} searchQuery - the full search query with @mentions
 * @returns {{channelSlugs: string[], trackQuery: string}}
 */
export function parseMentionQuery(searchQuery) {
	const parts = searchQuery.trim().split(/\s+/)
	const channelSlugs = []
	let trackQueryParts = []

	for (const part of parts) {
		if (part.startsWith('@')) {
			channelSlugs.push(part.slice(1))
		} else {
			trackQueryParts.push(part)
		}
	}

	return {
		channelSlugs,
		trackQuery: trackQueryParts.join(' ')
	}
}

/**
 * Find channel by slug from collection
 * @param {string} slug
 * @returns {object|undefined}
 */
function findChannelBySlug(slug) {
	return [...channelsCollection.state.values()].find((ch) => ch.slug === slug)
}

/**
 * Search channels and tracks
 * @param {string} searchQuery - search query (may start with @slug or @slug1 @slug2)
 * @param {{remote?: boolean, limit?: number}} [options]
 * @returns {Promise<{channels: Array, tracks: Array}>}
 */
export async function searchAll(searchQuery, options = {}) {
	const {remote = false, limit = 100} = options

	if (searchQuery.trim().length < 2) {
		return {channels: [], tracks: []}
	}

	// "@channel-slug query" or "@slug1 @slug2 query" syntax
	// "@good-time-radio 80s" returns that channel + tracks matching "80s"
	// "@ko002 @oskar house" returns both channels + tracks matching "house" in either
	const isMention = searchQuery.includes('@')
	if (isMention) {
		const {channelSlugs, trackQuery} = parseMentionQuery(searchQuery)

		// Find all mentioned channels
		const channels = channelSlugs.map(findChannelBySlug).filter(Boolean)

		// Search tracks across all mentioned channels
		let tracks = []
		if (trackQuery) {
			const results = await Promise.all(
				channelSlugs.map((slug) => searchTracks(trackQuery, {remote, limit, channelSlug: slug}))
			)
			tracks = results.flat()
		}

		return {channels, tracks}
	}

	const [channels, tracks] = await Promise.all([
		searchChannels(searchQuery, {remote, limit}),
		searchTracks(searchQuery, {remote, limit})
	])
	return {channels, tracks}
}

export default {
	all: searchAll,
	channels: searchChannels,
	tracks: searchTracks
}
