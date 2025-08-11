import {pg, dropDb, exportDb, migrateDb} from './db.js'
import {r4} from './r4.js'
import {pullV1Channels, fetchV1Tracks, migrateTracks} from './v1.js'
import {performSearch, searchChannels, searchTracks} from './search.js'
import {logger} from '$lib/logger'

const log = logger.ns('r5').seal()

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
		const v1Tracks = await fetchV1Tracks({firebase: channel.firebase_id})
		const tracks = migrateTracks(v1Tracks, channel.id)
		await insertTracks(slug, tracks)
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
		await insertChannels([channel])
		const result = await localChannels({slug})
		return result[0]
	}
	await pullV1Channels()
	const channels = await r4.channels.readChannels(limit)
	await insertChannels(channels)
	return await localChannels({limit})
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

/**
 * Returns true if a channel is outdated and needs pulling
 * @param {string} slug - Channel slug
 * @returns {Promise<boolean>}
 */
async function outdated(slug) {
	try {
		const {
			rows: [channel]
		} = await pg.sql`select * from channels where slug = ${slug}`
		const {id} = channel
		if (!id || !channel.tracks_synced_at) return true

		// Get latest local track update
		const {rows: localRows} = await pg.sql`
      select updated_at
      from tracks
      where channel_id = ${id}
      order by updated_at desc
      limit 1
    `
		const localLatest = localRows[0]
		if (!localLatest) return true

		// v1 channels dont need updating because it is in read-only state since before this project
		if (channel.firebase_id && localLatest) return false

		// Get latest remote track update
		const {data: remoteLatest} = await r4.sdk.supabase
			.from('channel_track')
			.select('updated_at')
			.eq('channel_id', id)
			.order('updated_at', {ascending: false})
			.limit(1)
			.single()
			.throwOnError()

		// Compare timestamps (ignoring milliseconds)
		const remoteMsRemoved = new Date(remoteLatest.updated_at).setMilliseconds(0)
		const localMsRemoved = new Date(localLatest.updated_at).setMilliseconds(0)
		const toleranceMs = 20 * 1000
		const x = remoteMsRemoved - localMsRemoved > toleranceMs
		return x
	} catch (error) {
		log.error('needs_update_error', error)
		return true // On error, suggest update to be safe
	}
}

/**
 * Insert channels data into local database
 * @param {import('$lib/types').Channel[]} channels - Channel data to insert
 */
async function insertChannels(channels) {
	await pg.transaction(async (tx) => {
		for (const channel of channels) {
			await tx.sql`
        INSERT INTO channels (id, name, slug, description, image, created_at, updated_at, latitude, longitude, url, track_count)
        VALUES (
          ${channel.id}, ${channel.name}, ${channel.slug},
          ${channel.description}, ${channel.image},
          ${channel.created_at}, ${channel.updated_at},
          ${channel.latitude}, ${channel.longitude},
          ${channel.url}, ${channel.track_count || 0}
        )
        ON CONFLICT (slug)  DO UPDATE SET
          id = EXCLUDED.id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          image = EXCLUDED.image,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          url = EXCLUDED.url,
          track_count = COALESCE(EXCLUDED.track_count, channels.track_count),
          firebase_id = NULL;
      `
		}
	})
	log.log('insert_channels', channels)
}

/**
 * Insert tracks data into local database
 * @param {string} slug - Channel slug
 * @param {import('$lib/types').Track[]} tracks - Track data to insert
 */
async function insertTracks(slug, tracks) {
	try {
		// Get the channel
		const channel = (await pg.sql`update channels set busy = true where slug = ${slug} returning *`)
			.rows[0]
		if (!channel) throw new Error(`insert_tracks_error_404: ${slug}`)

		// Insert tracks
		await pg.transaction(async (tx) => {
			const CHUNK_SIZE = 50
			for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
				const chunk = tracks.slice(i, i + CHUNK_SIZE)
				const inserts = chunk.map(
					(track) => tx.sql`
	        INSERT INTO tracks (
	          id, channel_id, url, title, description,
	          discogs_url, created_at, updated_at, tags, mentions, firebase_id
	        )
	        VALUES (
	          ${track.id}, ${channel.id}, ${track.url},
	          ${track.title}, ${track.description},
	          ${track.discogs_url}, ${track.created_at}, ${track.updated_at},
	          ${track.tags}, ${track.mentions}, ${track.firebase_id || null}
	        )
	        ON CONFLICT (id) DO UPDATE SET
	          url = EXCLUDED.url,
	          title = EXCLUDED.title,
	          description = EXCLUDED.description,
	          discogs_url = EXCLUDED.discogs_url,
	          updated_at = EXCLUDED.updated_at,
	          tags = EXCLUDED.tags,
	          mentions = EXCLUDED.mentions
	      `
				)
				await Promise.all(inserts)

				// Yield to UI thread between chunks
				if (i + CHUNK_SIZE < tracks.length) {
					await new Promise((resolve) => setTimeout(resolve, 0))
				}
			}
			log.log('insert_tracks', channel.slug, tracks?.length)
		})
		// Mark as successfully synced
		await pg.sql`update channels set busy = false, tracks_synced_at = CURRENT_TIMESTAMP, track_count = ${tracks.length} where slug = ${slug}`
	} catch (error) {
		// On error, just mark as not busy (tracks_synced_at stays NULL for retry)
		await pg.sql`update channels set busy = false where slug = ${slug}`
		throw error
	}
}

// Create the source-first API with callable objects
export const r5 = {
	channels: callableObject(
		localChannels, // default: r5.channels()
		{
			local: localChannels,
			r4: remoteChannels,
			pull: pullChannels,
			insert: insertChannels,
			outdated,
			v1: async ({slug, limit = 5000} = {}) => {
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
		}
	),

	tracks: callableObject(
		localTracks, // default: r5.tracks()
		{
			local: localTracks,
			r4: remoteTracks,
			pull: pullTracks,
			v1: fetchV1Tracks,
			insert: insertTracks
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
