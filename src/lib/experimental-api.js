import {pg, dropDb, exportDb, migrateDb} from '$lib/db'
import {r4} from '$lib/r4'
import {pullTracks, pullChannel, sync} from '$lib/sync'
import {pullV1Channels, pullV1Tracks} from '$lib/v1'
// import {play, pause, next, previous, eject, toggleShuffle, toggleVideo} from '$lib/player'
import {setPlaylist, addToPlaylist} from '$lib/api'
import {performSearch, searchChannels, searchTracks} from '$lib/search'

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
		where (${'name' in params} = false or name ilike ${`%${params.name}%`})
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
		where (${'channel' in params} = false or channel_slug = ${params.channel})
		order by created_at desc
	`
	return rows
}

/**
 * Fetch channels from remote without storing
 */
async function remoteChannels(params = {slug: ''}) {
	if (params.slug) return await r4.channels.readChannel(params.slug)
	return await r4.channels.readChannels()
}

/**
 * Fetch tracks from remote without storing
 */
async function remoteTracks(params = {slug: ''}) {
	if (params.slug) return await r4.channels.readChannelTracks(params.slug)
	throw new Error('remote tracks requires channel slug')
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
async function pullTracksData(params = {slug: ''}) {
	if (!params.slug) throw new Error('pull tracks requires channel slug')
	await pullTracks(params.slug)
	return await localTracks({channel: params.slug})
}

/**
 * Pull v1 channels and return them
 */
async function pullV1ChannelsData(params = {}) {
	await pullV1Channels(params)
	// Return only v1 channels (those with firebase_id)
	const {rows} = await pg.sql`
		select * from channels 
		where firebase_id is not null
		order by updated_at desc
	`
	return rows
}

/**
 * Pull v1 tracks for a channel and return them
 */
async function pullV1TracksData(channelId, firebaseId) {
	await pullV1Tracks(channelId, firebaseId, pg)
	return await localTracks({channel: channelId})
}

// Create the source-first API with callable objects
export const r5 = {
	channels: callableObject(
		localChannels, // default: r5.channels()
		{
			local: localChannels,
			remote: remoteChannels,
			pull: pullAndGetChannels,
			v1: pullV1ChannelsData
		}
	),

	tracks: callableObject(
		localTracks, // default: r5.tracks()
		{
			local: localTracks,
			remote: remoteTracks,
			pull: pullTracksData,
			v1: pullV1TracksData
		}
	),

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
	// 	stop: eject
	// },

	queue: {
		add: addToPlaylist,
		set: setPlaylist,
		clear: () => setPlaylist([])
		// shuffle: toggleShuffle
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
