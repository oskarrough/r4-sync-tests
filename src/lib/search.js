import fuzzysort from 'fuzzysort'
import {sdk} from '@radio4000/sdk'
import {channelsCollection} from '$lib/tanstack/collections'

/**
 * Search channels and tracks using Supabase FTS with websearch syntax.
 * Supports: "jazz house" (AND), "jazz or house" (OR), "jazz -disco" (exclude), "exact phrase" (quoted).
 */

/**
 * Search channels remotely
 * @param {string} query
 * @param {{limit?: number}} options
 * @returns {Promise<import('$lib/types').Channel[]>}
 */
export async function searchChannels(query, {limit = 100} = {}) {
	if (!query?.trim()) return []
	const {data, error} = await sdk.supabase
		.from('channels_with_tracks')
		.select('*')
		.textSearch('fts', query, {type: 'websearch'})
		.limit(limit)
	if (error) throw new Error(error.message)
	return /** @type {import('$lib/types').Channel[]} */ (data ?? [])
}

/**
 * Search tracks remotely, optionally scoped to a channel
 * @param {string} query
 * @param {{limit?: number, channelSlug?: string}} options
 * @returns {Promise<import('$lib/types').Track[]>}
 */
export async function searchTracks(query, {limit = 100, channelSlug} = {}) {
	if (!query?.trim()) return []
	let q = sdk.supabase.from('channel_tracks').select('*').textSearch('fts', query, {type: 'websearch'}).limit(limit)
	if (channelSlug) q = q.eq('slug', channelSlug)
	const {data, error} = await q
	if (error) throw new Error(error.message)
	return /** @type {import('$lib/types').Track[]} */ (data ?? [])
}

/**
 * Parse @mention syntax: "@ko002 jazz" or "@a @b house"
 * @param {string} query
 */
export function parseMentionQuery(query) {
	const parts = query.trim().split(/\s+/)
	const channelSlugs = []
	const trackQueryParts = []
	for (const part of parts) {
		if (part.startsWith('@')) {
			channelSlugs.push(part.slice(1))
		} else {
			trackQueryParts.push(part)
		}
	}
	return {channelSlugs, trackQuery: trackQueryParts.join(' ')}
}

/**
 * Find channel by slug from local collection
 * @param {string} slug
 */
function findChannelBySlug(slug) {
	return [...channelsCollection.state.values()].find((c) => c.slug === slug)
}

/**
 * Main search - remote only
 * @param {string} query
 * @param {{limit?: number}} options
 * @returns {Promise<{channels: import('$lib/types').Channel[], tracks: import('$lib/types').Track[]}>}
 */
export async function searchAll(query, {limit = 100} = {}) {
	if (query.trim().length < 2) return {channels: [], tracks: []}

	if (query.includes('@')) {
		const {channelSlugs, trackQuery} = parseMentionQuery(query)
		const channels = /** @type {import('$lib/types').Channel[]} */ (
			channelSlugs.map(findChannelBySlug).filter((c) => c !== undefined)
		)
		if (!trackQuery) return {channels, tracks: []}
		const results = await Promise.all(channelSlugs.map((slug) => searchTracks(trackQuery, {limit, channelSlug: slug})))
		return {channels, tracks: results.flat()}
	}

	const [channels, tracks] = await Promise.all([searchChannels(query, {limit}), searchTracks(query, {limit})])
	return {channels, tracks}
}

// Local fuzzy search utils (pure functions for potential reuse)

/**
 * Fuzzy search tracks locally
 * @param {string} query
 * @param {Array} tracks
 * @param {{limit?: number}} options
 */
export function searchTracksLocal(query, tracks, {limit = 100} = {}) {
	return fuzzysort.go(query, tracks, {keys: ['title', 'description'], limit}).map((r) => r.obj)
}

/**
 * Fuzzy search channels locally
 * @param {string} query
 * @param {Array} channels
 * @param {{limit?: number}} options
 */
export function searchChannelsLocal(query, channels, {limit = 100} = {}) {
	return fuzzysort.go(query, channels, {keys: ['name', 'slug', 'description'], limit}).map((r) => r.obj)
}

export default {
	all: searchAll,
	channels: searchChannels,
	tracks: searchTracks,
	tracksLocal: searchTracksLocal,
	channelsLocal: searchChannelsLocal
}
