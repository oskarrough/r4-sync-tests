import {ENTITY_REGEX} from '../utils.ts'
import {logger} from '../logger.js'
import {r4 as r4Api} from '../r4.ts'
import {getPg} from './db.js'
import * as channels from './channels.js'
import {sql, raw} from '@electric-sql/pglite/template'

const log = logger.ns('r5:tracks').seal()
const LIMIT = 4000

/** Get tracks from local database */
export async function local({slug = '', limit = LIMIT} = {}) {
	const pg = await getPg()
	const whereClause = slug ? sql`where channel_slug = ${slug}` : raw``
	return (
		await pg.sql`select * from tracks_with_meta ${whereClause} order by created_at desc limit ${limit}`
	).rows
}

/** Get tracks from r4 (remote) */
export async function r4({slug = '', limit = LIMIT} = {}) {
	return await r4Api.channels.readChannelTracks(slug, limit)
}

/** Get tracks from v1 (firebase) */
export async function v1(params) {
	// Handle CLI calls with slug parameter
	if (params.slug && !params.firebase) {
		const channel = (await channels.v1({slug: params.slug}))[0]
		if (!channel) return []
		params = {
			firebase: channel.firebase_id,
			channelId: channel.id,
			limit: params.limit
		}
	}

	const url = `https://radio4000.firebaseio.com/tracks.json?orderBy="channel"&startAt="${params.firebase}"&endAt="${params.firebase}"`
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to fetch tracks: ${res.status}`)
	const data = await res.json()
	if (!data) return []

	const tracks = Object.keys(data)
		.map((id) => ({...data[id], id}))
		.sort((a, b) => a.created - b.created)
		.map((t) => parseFirebaseTrack(t, params.channelId))

	return params.limit ? tracks.slice(0, params.limit) : tracks
}

/** Pull tracks from remote sources and store locally */
export async function pull({slug = '', limit = LIMIT} = {}) {
	const channel = (await channels.local({slug}))[0]
	if (!channel) throw new Error(`pull_tracks:channel_not_found: ${slug}`)

	if (!(await channels.outdated(slug))) {
		return await local({slug, limit})
	}

	if (channel.source === 'v1') {
		const v1Tracks = await v1({
			firebase: channel.firebase_id,
			slug,
			channelId: channel.id
		})
		await insert(slug, v1Tracks)
	} else {
		const tracks = await r4({slug, limit})
		await insert(slug, tracks)
	}
	return await local({slug, limit})
}

/** Insert tracks into local database */
export async function insert(slug, tracks) {
	const pg = await getPg()
	let channel = (await pg.sql`select * from channels where slug = ${slug}`).rows[0]
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
		const inserts = tracksToInsert.map(
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
	})

	// Mark as successfully synced
	await pg.sql`update channels set tracks_synced_at = CURRENT_TIMESTAMP, track_count = ${tracksToInsert.length} where slug = ${slug}`
	log.log('inserted tracks', slug, tracksToInsert.length)
}

// Helper functions for v1 support

function parseFirebaseTrack(track, channelId) {
	const description = track.body || ''

	// Extract tags and mentions using the same regex as link-entities.svelte
	const tags = []
	const mentions = []

	description.replace(ENTITY_REGEX, (match, _prefix, entity) => {
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
