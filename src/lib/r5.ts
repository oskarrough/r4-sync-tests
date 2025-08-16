import {pg, dropDb, exportDb, migrateDb, debugLimit} from './db.js'
import {r4} from './r4.js'
import {performSearch, searchChannels, searchTracks} from './search.js'
import {logger} from './logger'
import {ENTITY_REGEX} from './utils.js'
import type {ChannelFirebase, Track} from './types'

const log = logger.ns('r5').seal()

function callableObject(defaultFn, methods) {
	return Object.assign(defaultFn, methods)
}

async function localChannels({slug = '', limit = 3000} = {}) {
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

async function localTracks({slug = '', limit = 4000} = {}) {
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

async function remoteChannels({slug = '', limit = 3000} = {}) {
	if (slug) {
		const channel = await r4.channels.readChannel(slug)
		return Array.isArray(channel) ? channel : [channel]
	}
	return await r4.channels.readChannels(limit)
}

async function remoteTracks({slug, limit = 4000} = {}) {
	return await r4.channels.readChannelTracks(slug, limit)
}

async function pullTracks({slug, limit} = {}) {
	const channel = (await localChannels({slug}))[0]
	if (!channel) throw new Error(`pull_tracks:channel_not_found: ${slug}`)

	if (!(await outdated(slug))) {
		return await localTracks({slug, limit})
	}

	if (channel.source === 'v1') {
		const v1Tracks = await fetchV1Tracks({
			firebase: channel.firebase_id,
			slug,
			channelId: channel.id
		})
		await insertTracks(slug, v1Tracks)
	} else {
		const tracks = await remoteTracks({slug, limit})
		await insertTracks(slug, tracks)
	}
	return await localTracks({slug, limit})
}

async function pullChannels({slug = '', limit = 3000} = {}) {
	if (slug) {
		// Check local first
		const local = await localChannels({slug})
		if (local.length) {
			// Update in background if outdated
			if (await outdated(slug)) {
				console.log('pullChannels -> outdated -> pullTracks non-async')
				pullTracks({slug}).catch((error) => log.error(error))
			} else {
				console.log('not outdated')
			}
			return local
		}

		// Try r4
		try {
			const channels = await remoteChannels({slug})
			if (channels.length) {
				await insertChannels(channels)
				return await localChannels({slug})
			}
		} catch {
			// Channel not found in r4, continue to v1
		}

		// Try v1
		const v1Channels = await r5.channels.v1({slug})
		if (v1Channels.length) {
			await insertChannels(v1Channels)
			return await localChannels({slug})
		}

		throw new Error(`pull_channels:channel_not_found: ${slug}`)
	}

	const channels = await r4.channels.readChannels(limit)
	await insertChannels(channels)
	await pullV1Channels({limit}) // must happen after r4 is inserted, so it skips v1 channels already existing in r4
	return await localChannels({limit})
}

async function pullEverything(slug: string) {
	const channels = await pullChannels({slug})
	const tracks = await pullTracks({slug})
	return {channels, tracks}
}

/** Returns true if a channel is outdated and needs pulling */
async function outdated(slug: string): Promise<boolean> {
	try {
		const channel = (await r5.channels({slug}))[0]
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
		if (channel.source === 'v1' && localLatest) return false

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
		const isOutdated = remoteMsRemoved - localMsRemoved > toleranceMs
		return isOutdated
	} catch (error) {
		log.error('needs_update_error', error)
		return true // On error, suggest update to be safe
	}
}

/**
 * Insert channels data into local database
 * @param {Channel[]} channels - Channel data to insert
 */
async function insertChannels(channels) {
	await pg.transaction(async (tx) => {
		for (const channel of channels) {
			await tx.sql`
        INSERT INTO channels (id, name, slug, description, image, created_at, updated_at, latitude, longitude, url, track_count, firebase_id, source)
        VALUES (
          ${channel.id}, ${channel.name}, ${channel.slug},
          ${channel.description}, ${channel.image},
          ${channel.created_at}, ${channel.updated_at},
          ${channel.latitude}, ${channel.longitude},
          ${channel.url}, ${channel.track_count || 0}, ${channel.firebase_id || null}, ${channel.source || null}
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          image = EXCLUDED.image,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          url = EXCLUDED.url,
          track_count = COALESCE(EXCLUDED.track_count, channels.track_count),
          firebase_id = COALESCE(EXCLUDED.firebase_id, channels.firebase_id),
          source = COALESCE(EXCLUDED.source, channels.source);
      `
		}
	})
	log.log('inserted channels', channels.length)
}

/**
 * Insert tracks data into local database
 * @param {string} slug - Channel slug
 * @param {Track[]} tracks - Track data to insert
 */
async function insertTracks(slug, tracks) {
	try {
		// Get the channel
		const channel = (await pg.sql`update channels set busy = true where slug = ${slug} returning *`)
			.rows[0]
		if (!channel) throw new Error(`insert_tracks_error_404: ${slug}`)

		// Skip v1 re-imports
		let tracksToInsert = tracks
		if (channel.source === 'v1') {
			const existing = await pg.sql`
				SELECT firebase_id FROM tracks 
				WHERE channel_id = ${channel.id} AND firebase_id IS NOT NULL
			`
			if (existing.rows.length) {
				const existingIds = new Set(existing.rows.map((r) => r.firebase_id))
				const before = tracks.length
				tracksToInsert = tracks.filter((t) => !existingIds.has(t.firebase_id))
				const skipped = before - tracksToInsert.length
				if (skipped) console.log(`Skipping ${skipped} duplicate v1 tracks for ${slug}`)
			}
		}

		// Insert tracks
		await pg.transaction(async (tx) => {
			const CHUNK_SIZE = 50
			for (let i = 0; i < tracksToInsert.length; i += CHUNK_SIZE) {
				const chunk = tracksToInsert.slice(i, i + CHUNK_SIZE)
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
		})
		// Mark as successfully synced
		await pg.sql`update channels set busy = false, tracks_synced_at = CURRENT_TIMESTAMP, track_count = ${tracksToInsert.length} where slug = ${slug}`
		log.log('inserted tracks', slug, tracksToInsert.length)
	} catch (error) {
		// On error, just mark as not busy (tracks_synced_at stays NULL for retry)
		await pg.sql`update channels set busy = false where slug = ${slug}`
		throw error
	}
}

// To access the local json file in both browser and bun/node
async function readv1() {
	const browser = typeof window !== 'undefined'
	const filename = 'channels-firebase-modified.json'
	if (browser) {
		const res = await fetch(filename)
		return await res.json()
	} else {
		// Use file:// URL for node/bun environments
		const res = await fetch(`file://${process.cwd()}/static/${filename}`)
		return await res.json()
	}
}

async function getV1Channels({slug = '', limit = 5000} = {}) {
	try {
		const items = await readv1()
		const filtered = slug ? items.filter((item) => item.slug === slug) : items
		const channels = filtered
			.slice(0, limit)
			.filter((item) => item.track_count && item.track_count > 3)
		return channels.map(parseFirebaseChannel)
	} catch (err) {
		log.error(err)
		throw err
	}
}

function parseFirebaseChannel(item: ChannelFirebase) {
	return {
		id: crypto.randomUUID(),
		firebase_id: item.firebase_id,
		slug: item.slug,
		name: item.name,
		description: item.description || '',
		image: item.image,
		track_count: item.track_count || 0,
		source: 'v1',
		created_at: new Date(item.created_at).toISOString(),
		updated_at: new Date(item.updated_at || item.created_at).toISOString()
	}
}

function parseFirebaseTrack(track: Record<string, unknown>, channelId: string): Track {
	const description = (track.body || '') as string

	// Extract tags and mentions using the same regex as link-entities.svelte
	const tags = []
	const mentions = []

	description.replace(ENTITY_REGEX, (match, prefix, entity) => {
		if (entity.startsWith('#')) {
			tags.push(entity.toLowerCase())
		} else if (entity.startsWith('@')) {
			mentions.push(entity.slice(1).toLowerCase())
		}
		return match
	})

	return {
		id: crypto.randomUUID(),
		firebase_id: track.id,
		channel_id: channelId,
		url: track.url,
		title: track.title,
		description: track.body || '',
		discogs_url: track.discogsUrl || '',
		source: 'v1',
		tags: tags.length > 0 ? tags : null,
		mentions: mentions.length > 0 ? mentions : null,
		created_at: new Date(track.created).toISOString(),
		updated_at: new Date(track.updated || track.created).toISOString()
	}
}

/**
 * Imports a local export of v1 channels using insertChannels
 * on slug conflict, update existing
 * ignores channels with <= 3 tracks
 */
async function pullV1Channels({limit = debugLimit} = {}) {
	const items: ChannelFirebase[] = (await readv1()).slice(0, limit)

	const {rows: existingChannels} = await pg.sql`select slug, firebase_id from channels`
	const filteredItems = items.filter(
		(item) =>
			!existingChannels.some((r) => r.slug === item.slug || r.firebase_id === item.firebase_id) &&
			item.track_count &&
			item.track_count > 3
	)

	const channels = filteredItems.map(parseFirebaseChannel)
	try {
		await insertChannels(channels)
	} catch (err) {
		log.error('pull_v1_channels_error', err)
	}
	log.log('pull_v1_channels', channels.length)
}

/**
 * Fetches V1 tracks and maps them for API consumption
 * @param {Object} params
 * @param {string} params.firebase - firebase channel id
 * @param {string} params.channelId - channel uuid
 * @param {number} [params.limit] - optional limit
 */
async function fetchV1Tracks({firebase, channelId, limit} = {}) {
	const v1Tracks = await readFirebaseChannelTracks(firebase)
	const mapped = v1Tracks.map((t) => parseFirebaseTrack(t, channelId))
	return limit ? mapped.slice(0, limit) : mapped
}

/**
 * Fetches all v1 tracks from a v1 channel id
 * @param {string} cid
 */
async function readFirebaseChannelTracks(cid) {
	/** @param {any} value @param {string} id */
	const toObject = (value, id) => ({...value, id})
	/** @param {Record<string, any>} data */
	const toArray = (data) => Object.keys(data).map((id) => toObject(data[id], id))
	const url = `https://radio4000.firebaseio.com/tracks.json?orderBy="channel"&startAt="${cid}"&endAt="${cid}"`

	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to fetch tracks: ${res.status}`)
	const data = await res.json()
	if (!data) return []

	return toArray(data).sort((a, b) => a.created - b.created)
}

// Create the source-first API with callable objects
export const r5 = {
	channels: callableObject(
		localChannels, // default: r5.channels()
		{
			local: localChannels,
			r4: remoteChannels,
			pull: pullChannels,
			v1: getV1Channels,
			insert: insertChannels,
			outdated
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

	pull: pullEverything,

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
