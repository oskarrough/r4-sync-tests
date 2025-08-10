import {pg, dropDb, exportDb, migrateDb} from './db.js'
import {r4} from './r4'
import {insertTracks, insertChannel, insertChannels} from './sync.js'
import {pullV1Channels, pullV1Tracks, readFirebaseChannelTracks} from './v1.js'
import {performSearch, searchChannels, searchTracks} from './search.js'

function callableObject(defaultFn, methods) {
	return Object.assign(defaultFn, methods)
}

async function localChannels({slug, limit = 3000} = {}) {
	if (!slug) {
		return (await pg.sql` select * from channels order by updated_at desc limit ${limit} `).rows
	}
	return (
		await pg.sql`
        select * from channels
        where slug = ${slug}
        order by updated_at desc
        limit ${limit}
    `
	).rows
}

async function localTracks({slug, limit = 4000} = {}) {
	if (!slug) {
		const {rows} = await pg.sql`
			select * from tracks_with_meta
			order by created_at desc
			limit ${limit}
		`
		return rows
	}

	const {rows} = await pg.sql`
		select * from tracks_with_meta
		where channel_slug = ${slug}
		order by created_at desc
		limit ${limit}
	`
	return rows
}

async function remoteChannels({slug, limit = 3000} = {}) {
	if (slug) return await r4.channels.readChannel(slug)
	return await r4.channels.readChannels(limit)
}

async function remoteTracks({slug, limit = 4000} = {}) {
	return await r4.channels.readChannelTracks(slug, limit)
}

async function pullTracks({slug, limit} = {}) {
	const channel = (await localChannels({slug}))[0]
	if (!channel) throw new Error(`sync:insert_tracks_error_404: ${slug}`)
	if (channel.firebase_id) {
		await pullV1Tracks(channel.id, channel.firebase_id, pg)
	} else {
		const tracks = await remoteTracks({slug, limit})
		await insertTracks(slug, tracks)
	}
	return await localTracks({slug, limit})
}

async function pullChannels({slug, limit = 3000} = {}) {
	if (slug) {
		const channel = await remoteChannels({slug})
		if (!channel) throw new Error(`Channel not found: ${slug}`)
		await insertChannel(channel)
		const result = await localChannels({slug})
		return result[0]
	}
	await pullV1Channels()
	const channels = await r4.channels.readChannels(limit)
	await insertChannels(channels)
	return await localChannels({limit})
}

async function fetchV1Channels({slug, limit = 5000} = {}) {
	const res = await fetch('/channels-firebase-modified.json')

	const items = await res.json()
	const filtered = slug ? items.filter((item) => item.slug === slug) : items
	const channels = filtered
		.slice(0, limit)
		.filter((item) => item.track_count && item.track_count > 3)

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

async function fetchV1Tracks({channel, firebase, limit} = {}) {
	const v1Tracks = await readFirebaseChannelTracks(firebase)

	const mapped = v1Tracks.map((track) => ({
		id: track.id,
		firebase_id: track.id,
		channel_slug: channel,
		url: track.url,
		title: track.title,
		description: track.body || '',
		discogs_url: track.discogsUrl || '',
		created_at: new Date(track.created).toISOString(),
		updated_at: new Date(track.updated || track.created).toISOString()
	}))
	return limit ? mapped.slice(0, limit) : mapped
}

async function pullEverything(slug) {
	if (!slug) {
		// Pull all channels when no slug provided
		return await pullChannels()
	}
	await pullChannels({slug})
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
			pull: pullChannels,
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
		channel: pullChannels
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

}
