import {r5} from '$lib/r5'
import {pg} from '$lib/r5/db'

/**
 * The @radio4000/sdk provides search for channels and tracks v2.
 * This module provides search via channels and tracks inside PGLite.
 */

/**
 * Search channels using fuzzy matching with pg_trgm
 * @param {string} query - search query
 * @returns {Promise<Array>} - channel results with similarity scores
 */
export async function searchChannels(query) {
	const likeQuery = `%${query.toLowerCase()}%`

	const {rows} = await pg.query(
		`
		SELECT id, name, slug, description, image,
		       GREATEST(
		         similarity(name, $2),
		         similarity(description, $2),
		         similarity(slug, $2)
		       ) as similarity_score
		FROM channels
		WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(slug) LIKE $1
		   OR name % $2 OR description % $2 OR slug % $2
		ORDER BY similarity_score DESC, name
		`,
		[likeQuery, query]
	)

	return rows
}

/**
 * Search tracks by title and description
 * @param {string} query - search query
 * @param {string} [channelSlug] - optional channel slug to filter by
 * @returns {Promise<Array>} - track results
 */
export async function searchTracks(query, channelSlug) {
	const likeQuery = `%${query.toLowerCase()}%`

	if (channelSlug) {
		const {rows} = await pg.query(
			`
			SELECT *
			FROM tracks_with_meta
			WHERE slug = $1
			AND (LOWER(title) LIKE $2 OR LOWER(description) LIKE $2)
			ORDER BY title
			`,
			[channelSlug, likeQuery]
		)
		return rows
	}

	const {rows} = await pg.query(
		`
		SELECT *
		FROM tracks_with_meta
		WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1
		ORDER BY title
		`,
		[likeQuery]
	)

	return rows
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
 * Search local channels and tracks
 * @param {string} searchQuery - search query (may start with @slug or @slug1 @slug2)
 * @returns {Promise<{channels: Array, tracks: Array}>}
 */
export async function searchAll(searchQuery) {
	if (searchQuery.trim().length < 2) {
		return {channels: [], tracks: []}
	}

	// "@channel-slug query" or "@slug1 @slug2 query" syntax
	// "@good-time-radio 80s" returns that channel + tracks matching "80s"
	// "@ko002 @oskar house" returns both channels + tracks matching "house" in either
	const isMention = searchQuery.includes('@')
	if (isMention) {
		const {channelSlugs, trackQuery} = parseMentionQuery(searchQuery)

		// Fetch all mentioned channels
		const channelPromises = channelSlugs.map((slug) => r5.channels.local({slug}))
		const channelResults = await Promise.all(channelPromises)
		const channels = channelResults.flat()

		// Search tracks across all mentioned channels
		let tracks = []
		if (trackQuery) {
			const trackPromises = channelSlugs.map((slug) => searchTracks(trackQuery, slug))
			const trackResults = await Promise.all(trackPromises)
			tracks = trackResults.flat()
		}

		return {channels, tracks}
	}

	const [channels, tracks] = await Promise.all([searchChannels(searchQuery), searchTracks(searchQuery)])
	return {channels, tracks}
}

export default {
	all: searchAll,
	channels: searchChannels,
	tracks: searchTracks
}
