import {pg} from '$lib/db'
import {r4} from '$lib/r4'
import {pullChannels, pullTracks, pullChannel, pullV1Channels} from '$lib/sync'
import {play, pause, next, previous, eject, toggleShuffle, toggleVideo} from '$lib/player'
import {setPlaylist, addToPlaylist} from '$lib/api'
import {searchGlobal} from '$lib/search'

// Verb-first approach for comparison
export const r5VerbFirst = {
	// Query operations (local reads)
	query: {
		channels: async (params = {}) => {
			const {rows} = await pg.sql`
				select * from channels 
				where (${'name' in params} = false or name ilike ${`%${params.name}%`})
				order by updated_at desc
			`
			return rows
		},
		tracks: async (params = {}) => {
			const {rows} = await pg.sql`
				select t.*, c.slug as channel_slug from tracks t
				join channels c on t.channel_id = c.id
				where (${'channel' in params} = false or c.slug = ${params.channel})
				order by t.created_at desc
			`
			return rows
		}
	},

	// Read operations (remote fetches, no store)
	read: {
		channels: async (params = {}) => {
			if (params.slug) {
				return await r4.channels.readChannel(params.slug)
			}
			throw new Error('read channels without slug not implemented')
		},
		tracks: async (params = {}) => {
			if (params.channel) {
				return await r4.channels.readChannelTracks(params.channel)
			}
			throw new Error('read tracks requires channel slug')
		}
	},

	// Pull operations (remote fetch + local store)
	pull: {
		channels: async (params = {}) => {
			if (params.slug) {
				return await pullChannel(params.slug)
			}
			return await pullChannels()
		},
		tracks: async (params = {}) => {
			if (!params.channel) {
				throw new Error('pull tracks requires channel slug')
			}
			return await pullTracks(params.channel)
		}
	},

	// Sync operations (pull + return)
	sync: {
		channels: async (params = {}) => {
			await r5VerbFirst.pull.channels(params)
			return await r5VerbFirst.query.channels(params)
		},
		tracks: async (params = {}) => {
			await r5VerbFirst.pull.tracks(params)
			return await r5VerbFirst.query.tracks(params)
		}
	},

	// Player operations
	play: {
		track: (track) => play({track}),
		channel: (channel) => play({channel}),
		resume: () => play()
	},

	pause,
	next,
	prev: previous,
	stop: eject,

	// Queue operations
	add: {
		toQueue: addToPlaylist
	},

	set: {
		queue: setPlaylist
	},

	clear: {
		queue: () => setPlaylist([])
	},

	toggle: {
		shuffle: toggleShuffle,
		video: toggleVideo
	},

	search: searchGlobal,

	// Migration
	migrate: {
		v1: {
			channels: pullV1Channels
		}
	},

	// Database
	db: {
		pg,
		export: () => {
			throw new Error('export not implemented')
		},
		reset: () => {
			throw new Error('reset not implemented')
		}
	}
}
