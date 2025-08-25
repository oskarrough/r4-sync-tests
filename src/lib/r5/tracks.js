import {raw, sql} from '@electric-sql/pglite/template'
import {logger} from '../logger.js'
import {r4 as r4Api} from '../r4.ts'
import {ENTITY_REGEX} from '../utils.ts'
import * as channels from './channels.js'
import {getPg} from './db.js'

const log = logger.ns('r5:tracks').seal()
const LIMIT = 5000

/** Internal helper to resolve track ID to channel slug */
async function trackIdToSlug(id) {
	const pg = await getPg()
	// try to get slug local
	const rows = await pg.sql`select channel_slug from tracks_with_meta where id = ${id}`
	if (rows.length) return rows[0].channel_slug
	// fallback to r4
	try {
		const {data} = await r4Api.sdk.supabase
			.from('channel_track')
			.select('channels(slug)')
			.eq('track_id', id)
			.single()
			.throwOnError()
		if (data?.channels?.slug) return data.channels.slug
	} catch {
		// Continue to check if it's just a track that exists
	}
	throw new Error(`trackIdToSlug:not_found: ${id}`)
}

export {trackIdToSlug}

/** Get tracks from local database */
export async function local({slug = '', limit = LIMIT} = {}) {
	const pg = await getPg()
	const whereClause = slug ? sql`where channel_slug = ${slug}` : raw``
	return (await pg.sql`select * from tracks_with_meta ${whereClause} order by created_at desc limit ${limit}`).rows
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
export async function pull({id, slug = '', limit = LIMIT} = {}) {
	// If ID provided, resolve to slug first (ID takes precedence)
	if (id) {
		slug = await trackIdToSlug(id)
	}

	if (!slug) {
		throw new Error(`pull_tracks:missing_slug_or_id`)
	}

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
	const channel = (await pg.sql`select * from channels where slug = ${slug}`).rows[0]
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

	// Insert tracks using batched approach for worker performance
	if (tracksToInsert.length > 0) {
		console.time(`inserting ${tracksToInsert.length} tracks`)

		await pg.transaction(async (tx) => {
			const batchSize = 1000 // Larger batches since we're doing single queries

			for (let i = 0; i < tracksToInsert.length; i += batchSize) {
				const batch = tracksToInsert.slice(i, i + batchSize)

				// Build single multi-row INSERT with all parameter substitution
				const values = batch.map((track) => [
					track.id,
					channel.id,
					track.url,
					track.title,
					track.description,
					track.discogs_url,
					track.created_at,
					track.updated_at,
					track.tags,
					track.mentions,
					track.firebase_id || null
				])

				// Flatten all values for parameter substitution
				const flatValues = values.flat()

				// Build VALUES clause with parameter placeholders
				const valuesClause = values
					.map((_, idx) => {
						const offset = idx * 11 // 11 columns per row
						return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
					})
					.join(', ')

				const sql = `
					INSERT INTO tracks (
						id, channel_id, url, title, description,
						discogs_url, created_at, updated_at, tags, mentions, firebase_id
					)
					VALUES ${valuesClause}
					ON CONFLICT (id) DO UPDATE SET
						url = EXCLUDED.url,
						title = EXCLUDED.title,
						description = EXCLUDED.description,
						discogs_url = EXCLUDED.discogs_url,
						updated_at = EXCLUDED.updated_at,
						tags = EXCLUDED.tags,
						mentions = EXCLUDED.mentions
				`

				await tx.query(sql, flatValues)

				// Progress logging
				const processed = Math.min(i + batchSize, tracksToInsert.length)
				console.log(`inserted ${processed}/${tracksToInsert.length} tracks`)
			}
		})

		console.timeEnd(`inserting ${tracksToInsert.length} tracks`)
	}

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
