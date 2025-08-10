import {pg, debugLimit} from '$lib/db'
import {logger} from '$lib/logger'
const log = logger.ns('sync').seal()

/** @typedef {import('$lib/types').ChannelFirebase[]} ChannelFirebase */

/**
 * Imports a local export of v1 channels
 * on slug conflict, ignore
 * ignores channels with > 3 tracks
 * inserts into local db
 */
export async function pullV1Channels({limit} = {limit: debugLimit}) {
	const res = await fetch('/channels-firebase-modified.json')

	/** @type {ChannelFirebase} */
	const items = (await res.json()).slice(0, limit)
	const {rows: existingChannels} = await pg.sql`select slug from channels`
	const channels = items.filter(
		(item) =>
			!existingChannels.some((r) => r.slug === item.slug) && // ignore already imported channels (v1 data is readyonly)
			item.track_count &&
			item.track_count > 3 // ignore almost empty channels
	)

	try {
		await pg.transaction(async (tx) => {
			for (const item of channels) {
				try {
					await tx.sql`
					insert into channels (created_at, updated_at, slug, name, description, image, firebase_id, track_count)
					values (
						${item.created_at},
						${item.updated_at || item.created_at},
						${item.slug},
						${item.name},
						${item.description},
						${item.image},
						${item.firebase_id},
						${item.track_count || 0}
					)
					on conflict (slug) do nothing
					`
				} catch (err) {
					log.error('pull_v1_channels_error', item.slug, err)
				}
			}
		})
	} catch (err) {
		log.error('pull_v1_channels_error', err)
	}
	log.log('pull_v1_channels', channels)
}

/**
 * Imports tracks from a v1 channel
 * @param {string} channelId
 * @param {string} channelFirebaseId
 * @param {typeof pg} pg
 */
export async function pullV1Tracks(channelId, channelFirebaseId, pg) {
	if (!pg) throw new Error('Missing pg')

	const v1Tracks = await readFirebaseChannelTracks(channelFirebaseId)

	/** @type {import('$lib/types').Track[]} */
	const tracks = v1Tracks.map((track) => ({
		id: track.id,
		firebase_id: track.id,
		channel_id: channelId,
		url: track.url,
		title: track.title,
		description: track.body || '',
		discogs_url: track.discogsUrl || '',
		created_at: new Date(track.created).toISOString(),
		updated_at: new Date(track.updated || track.created).toISOString()
	}))

	await pg.transaction(async (tx) => {
		const CHUNK_SIZE = 50
		for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
			const chunk = tracks.slice(i, i + CHUNK_SIZE)
			const inserts = chunk.map(
				(item) => tx.sql`
					insert into tracks (firebase_id, channel_id, created_at, updated_at, title, description, url, discogs_url)
					values (${item.firebase_id}, ${channelId}, ${item.created_at}, ${item.updated_at}, ${item.title}, ${item.description}, ${item.url}, ${item.discogs_url}) on conflict (firebase_id) do nothing
				`
			)
			await Promise.all(inserts)

			// Yield to UI thread between chunks
			if (i + CHUNK_SIZE < tracks.length) {
				await new Promise((resolve) => setTimeout(resolve, 0))
			}
		}

		// Mark as successfully synced
		await tx.sql`update channels set busy = false, tracks_synced_at = CURRENT_TIMESTAMP, track_count = ${tracks.length} where id = ${channelId}`
	})

	log.log('pull_v1_tracks', tracks.length)
}

/**
 * Fetches all v1 tracks from a v1 channel id
 * @param {string} cid
 */
export async function readFirebaseChannelTracks(cid) {
	const toObject = (value, id) => ({...value, id})
	const toArray = (data) => Object.keys(data).map((id) => toObject(data[id], id))
	const url = `https://radio4000.firebaseio.com/tracks.json?orderBy="channel"&startAt="${cid}"&endAt="${cid}"`

	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to fetch tracks: ${res.status}`)
	const data = await res.json()
	if (!data) return []

	return toArray(data).sort((a, b) => a.created - b.created)
}
