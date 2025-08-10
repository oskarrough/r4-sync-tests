import {pg, dropDb, exportDb, migrateDb, debugLimit} from './db.js'
import {r4} from './r4.js'
import {insertTracks, insertChannel, insertChannels} from './sync.js'
import {pullV1Channels} from './v1.js'
import {readFirebaseChannelTracks} from './v1.js'
import {performSearch, searchChannels, searchTracks} from './search.js'
// import {setPlaylist, addToPlaylist} from './api.js'
// import {play, pause, next, previous, eject, toggleShuffle, toggleVideo} from '$lib/player'

/** @typedef {import('$lib/types').Track} Track */
/** @typedef {import('$lib/types').Channel} Channel */

/**
 * Creates callable object - function with methods
 * @template {Function} TCall
 * @template {Record<string, unknown>} TMethods
 * @param {TCall} defaultFn - called when object is invoked as function
 * @param {TMethods} methods - methods to attach to the function
 * @returns {TCall & TMethods}
 */
function callableObject(defaultFn, methods) {
	return Object.assign(defaultFn, methods)
}

/**
 * Query local channels
 * @param {{slug?: string, limit?: number}} params
 * @returns {Promise<import('$lib/types').Channel[]>}
 */
async function localChannels(params = {}) {
	const slugParam = params.slug || null
	const limitParam = typeof params.limit === 'number' ? params.limit : 1000
	const {rows} = await pg.sql`
        select * from channels
        where (${slugParam} is null or slug = ${slugParam})
        order by updated_at desc
        limit ${limitParam}
    `
	return rows
}

/** Query local tracks
 * @param {{slug?: string, limit?: number}} params
 * @returns {Promise<import('$lib/types').Track[]>}
 */
async function localTracks(params = {}) {
	const slugParam = params.slug || null
	const limitParam = typeof params.limit === 'number' ? params.limit : 1000
	const {rows} = await pg.sql`
        select * from tracks_with_meta
        where (${slugParam} is null or channel_slug = ${slugParam})
        order by created_at desc
        limit ${limitParam}
    `
	return rows
}

/** Fetch channels from remote without storing */
async function remoteChannels(params = {slug: '', limit: debugLimit}) {
	if (params.slug) return await r4.channels.readChannel(params.slug)
	return await r4.channels.readChannels(params.limit)
}

/** Fetch tracks from remote without storing */
async function remoteTracks(params = {slug: '', limit: debugLimit}) {
	if (!params.slug) throw new Error('remote tracks requires channel slug')
	return await r4.channels.readChannelTracks(params.slug, params.limit)
}

/**
 * Pull channel(s) from remote, store locally, and return data
 * @param {{slug?: string, limit?: number}} [params] - if slug provided, pulls single channel; otherwise pulls all channels
 * @returns {Promise<import('$lib/types').Channel[] | import('$lib/types').Channel>}
 */
async function pullChannel(params = {}) {
	const {slug, limit} = params
	if (slug) {
		const channel = await remoteChannels({slug})
		if (!channel) throw new Error(`Channel not found: ${slug}`)
		await insertChannel(channel)
		const result = await localChannels({slug})
		return result[0]
	}
	// Pull all channels
	await pullChannels({limit})
	await pullV1Channels().catch((err) => console.error('pull_v1_channels_error', err))
	return await localChannels({limit})
}

/** Pull tracks from remote, store locally, and return data */
/**
 * @param {{slug?: string, limit?: number}} [params]
 * @returns {Promise<import('$lib/types').Track[]>}
 */
async function pullTracks(params = {}) {
	const {slug, limit} = params
	if (!slug) throw new Error('pull tracks requires channel slug')
	const tracks = await remoteTracks({slug, limit: debugLimit})
	await insertTracks(slug, tracks)
	return await localTracks({slug, limit})
}

/** Pull channels from remote, store locally, and return data */
/**
 * @param {{limit?: number}} [params]
 * @returns {Promise<import('$lib/types').Channel[]>}
 */
async function pullChannels(params = {}) {
	const {limit = debugLimit} = params
	const channels = await r4.channels.readChannels(limit)
	await insertChannels(channels)
	return await localChannels({limit})
}

/** Fetch v1 channels without storing them */
async function fetchV1Channels(params = {limit: debugLimit}) {
	const res = await fetch('/channels-firebase-modified.json')

	/** @type {import('$lib/types').ChannelFirebase[]} */
	const items = await res.json()

	// Apply limit and filter for non-empty channels
	const channels = items
		.slice(0, params.limit || debugLimit)
		.filter((item) => item.track_count && item.track_count > 3)

	/** @type {Channel[]} */
	return channels.map((item) => ({
		id: item.firebase_id,
		slug: item.slug,
		name: item.name,
		description: item.description || '',
		created_at: new Date(item.created_at).toISOString(),
		updated_at: new Date(item.updated_at).toISOString(),
		firebase_id: item.firebase_id,
		track_count: item.track_count
	}))
}

/** Fetch v1 tracks without storing them */
async function fetchV1Tracks(params = {channel: '', firebase: '', limit: undefined}) {
	if (!params.channel || !params.firebase) {
		throw new Error('v1 tracks requires channel and firebase params')
	}

	// @todo use r5 tracks v1 <firebase_channel_id> for this
	const v1Tracks = await readFirebaseChannelTracks(params.firebase)

	/** @type {Track[]} */
	const mapped = v1Tracks.map((track) => ({
		id: track.id,
		firebase_id: track.id,
		channel_slug: params.channel,
		url: track.url,
		title: track.title,
		description: track.body || '',
		discogs_url: track.discogsUrl || '',
		created_at: new Date(track.created).toISOString(),
		updated_at: new Date(track.updated || track.created).toISOString()
	}))
	return typeof params.limit === 'number' ? mapped.slice(0, params.limit) : mapped
}

/** Pull channel and its tracks - convenience method
 * @param {string} slug - channel slug
 */
async function pullEverything(slug) {
	if (!slug) throw new Error('pull requires channel slug')
	await pullChannel({slug})
	await pullTracks({slug})
	return await localTracks({slug})
}

// Create the source-first API with callable objects
export const r5 = {
	channels: callableObject(
		localChannels, // default: r5.channels()
		{
			local: localChannels,
			r4: remoteChannels,
			pull: pullChannel,
			v1: fetchV1Channels
		}
	),

	tracks: callableObject(
		localTracks, // default: r5.tracks()
		{
			local: localTracks,
			r4: remoteTracks,
			pull: pullTracks,
			v1: fetchV1Tracks
		}
	),

	pull: callableObject(pullEverything, {
		channel: pullChannel
	}),

	search: callableObject(performSearch, {
		all: performSearch,
		channels: searchChannels,
		tracks: searchTracks
	}),

	db: {
		pg,
		export: exportDb,
		reset: dropDb,
		migrate: migrateDb
	}

	// Stateful operations
	// player: {
	// 	play: callableObject(play, {
	// 		track: (track) => play({track}),
	// 		channel: (channel) => play({channel}),
	// 		resume: () => play()
	// 	}),
	// 	pause,
	// 	next,
	// 	prev: previous,
	// 	stop: eject,
	// 	shuffle: toggleShuffle
	// },

	// queue: {
	// 	add: addToPlaylist,
	// 	set: setPlaylist,
	// 	clear: () => setPlaylist([])
	// },
}
