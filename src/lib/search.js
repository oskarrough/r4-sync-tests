import {pg} from '$lib/db'

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
			WHERE channel_slug = $1 
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
 * Parse mention search query like "@oskar dance"
 * @param {string} searchQuery - the full search query starting with @
 * @returns {{channelSlug: string, trackQuery: string}}
 */
export function parseMentionQuery(searchQuery) {
	const mentionContent = searchQuery.slice(1).trim()
	const spaceIndex = mentionContent.indexOf(' ')

	const channelSlug = spaceIndex > -1 ? mentionContent.slice(0, spaceIndex) : mentionContent
	const trackQuery = spaceIndex > -1 ? mentionContent.slice(spaceIndex + 1).trim() : ''

	return {channelSlug, trackQuery}
}

/**
 * Perform complete search - handles both regular and mention queries
 * @param {string} searchQuery - search query (may start with @)
 * @returns {Promise<{channels: Array, tracks: Array}>}
 */
export async function performSearch(searchQuery) {
	if (searchQuery.trim().length < 2) {
		return {channels: [], tracks: []}
	}

	const isMention = searchQuery.startsWith('@')

	if (isMention) {
		const {channelSlug, trackQuery} = parseMentionQuery(searchQuery)

		// Always search for matching channels
		const channels = await searchChannels(channelSlug)

		// If we have a track query, search tracks within that channel
		const tracks = trackQuery ? await searchTracks(trackQuery, channelSlug) : []

		return {channels, tracks}
	}

	// Regular search
	const [channels, tracks] = await Promise.all([
		searchChannels(searchQuery),
		searchTracks(searchQuery)
	])

	return {channels, tracks}
}
