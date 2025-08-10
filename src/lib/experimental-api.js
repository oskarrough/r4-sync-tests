import {pg, dropDb, exportDb, migrateDb, debugLimit} from '$lib/db'
import {r4} from '$lib/r4'
import {pullTracks, pullChannel, sync} from '$lib/sync'
import {readFirebaseChannelTracks} from '$lib/v1'
import {setPlaylist, addToPlaylist} from '$lib/api'
import {performSearch, searchChannels, searchTracks} from '$lib/search'
// import {play, pause, next, previous, eject, toggleShuffle, toggleVideo} from '$lib/player'

/**
 * Creates callable object - function with methods
 * @param {Function} defaultFn - called when object is invoked as function
 * @param {Object} methods - methods to attach to the function
 */
function callableObject(defaultFn, methods) {
	return Object.assign(defaultFn, methods)
}

/**
 * Query local channels
 * @param {Object} params - query parameters
 * @returns {Promise<import('$lib/types.ts').Channel[]>}
 */
async function localChannels(params = {}) {
	const {rows} = await pg.sql`
		select * from channels 
		where (${'slug' in params} = false or slug = ${params.slug})
		order by updated_at desc
	`
	return rows
}

/**
 * Query local tracks
 */
async function localTracks(params = {}) {
	const {rows} = await pg.sql`
		select * from tracks_with_meta
		where (${'slug' in params} = false or channel_slug = ${params.slug})
		order by created_at desc
	`
	return rows
}

/**
 * Fetch channels from remote without storing
 */
async function remoteChannels(params = {slug: '', limit: debugLimit}) {
	if (params.slug) return await r4.channels.readChannel(params.slug)
	return await r4.channels.readChannels(params.limit)
}

/**
 * Fetch tracks from remote without storing
 */
async function remoteTracks(params = {slug: '', limit: debugLimit}) {
	if (!params.slug) throw new Error('remote tracks requires channel slug')
	return await r4.channels.readChannelTracks(params.slug, params.limit)
}

/**
 * Pull channels from all sources, store locally, and return data
 */
async function pullAndGetChannels(params = {slug: ''}) {
	if (params.slug) {
		await pullChannel(params.slug)
		return await localChannels({slug: params.slug})
	}
	await sync() // pulls both v1 and v2
	return await localChannels()
}

/**
 * Pull tracks from remote, store locally, and return data
 */
async function pullAndGetTracks(params = {slug: ''}) {
	if (!params.slug) throw new Error('pull tracks requires channel slug')
	await pullTracks(params.slug)
	return await localTracks({slug: params.slug})
}

/**
 * Fetch v1 channels without storing them
 */
async function fetchV1Channels(params = {limit: debugLimit}) {
	const res = await fetch('/channels-firebase-modified.json')
	const items = await res.json()
	// Apply limit and filter for non-empty channels
	const channels = items
		.slice(0, params.limit || debugLimit)
		.filter((item) => item.track_count && item.track_count > 3)

	// Transform to match channel schema for consistency
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

/**
 * Fetch v1 tracks without storing them
 */
async function fetchV1Tracks(params = {}) {
	if (!params.channel || !params.firebase) {
		throw new Error('v1 tracks requires channel and firebase params')
	}
	const v1Tracks = await readFirebaseChannelTracks(params.firebase)

	// Transform to match track schema for consistency
	return v1Tracks.map((track) => ({
		firebase_id: track.id,
		channel_slug: params.channel,
		url: track.url,
		title: track.title,
		description: track.body || '',
		discogs_url: track.discogsUrl || '',
		created_at: new Date(track.created).toISOString(),
		updated_at: new Date(track.updated || track.created).toISOString()
	}))
}

/**
 * Pull channel and its tracks - convenience method
 */
async function pullEverything(slug) {
	if (!slug) throw new Error('pull requires channel slug')
	await pullChannel(slug)
	await pullTracks(slug)
	return await localTracks({slug})
}

// Create the source-first API with callable objects
export const r5 = {
	channels: callableObject(
		localChannels, // default: r5.channels()
		{
			local: localChannels,
			r4: remoteChannels,
			pull: pullAndGetChannels,
			v1: fetchV1Channels
		}
	),

	tracks: callableObject(
		localTracks, // default: r5.tracks()
		{
			local: localTracks,
			r4: remoteTracks,
			pull: pullAndGetTracks,
			v1: fetchV1Tracks
		}
	),

	pull: callableObject(pullEverything, {
		channel: pullAndGetChannels,
		tracks: pullAndGetTracks
	}),

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

	queue: {
		add: addToPlaylist,
		set: setPlaylist,
		clear: () => setPlaylist([])
	},

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
}
