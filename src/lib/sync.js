import {r4} from '$lib/r4'
import {pg, debugLimit} from '$lib/db'
import {pullV1Tracks, pullV1Channels} from '$lib/v1'
import {logger} from '$lib/logger'
const log = logger.ns('sync').seal()

/**
	We have a remote PostgreSQL database on Supabase. This is the source of truth.
	We have a local PostgreSQL database in the browser via PGLite. We pull data from the remote into this.
	Write are done remote. Most reads are local, with on-demand pulling (syncing) in many cases.
*/

/**
 * Always pull channel metadata from Radio4000 into local database. Does not touch tracks.
 * @param {Object} options
 * @param {number} [options.limit=2000] - Number of channels to pull
 */
export async function pullChannels({limit = debugLimit} = {}) {
	// Use the channels_with_tracks view to get only channels that have tracks
	const {data: channels} = await r4.sdk.supabase
		.from('channels_with_tracks')
		.select('*')
		.order('updated_at', {ascending: false})
		.limit(limit)
		.throwOnError()

	await pg.transaction(async (tx) => {
		for (const channel of channels) {
			await tx.sql`
        INSERT INTO channels (id, name, slug, description, image, created_at, updated_at, latitude, longitude, url)
        VALUES (
          ${channel.id}, ${channel.name}, ${channel.slug},
          ${channel.description}, ${channel.image},
          ${channel.created_at}, ${channel.updated_at},
          ${channel.latitude}, ${channel.longitude},
          ${channel.url}
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
          firebase_id = NULL;
      `
		}
	})
	log.log('pull_channels', channels?.length)
}

/**
 * Pull all tracks for a channel from Radio4000 into local database
 * @param {string} slug - Channel slug
 */
export async function pullTracks(slug) {
	try {
		// Get the channel
		const channel = (await pg.sql`update channels set busy = true where slug = ${slug} returning *`)
			.rows[0]
		if (!channel) throw new Error(`sync:pull_tracks_error_404: ${slug}`)

		if (channel.firebase_id) return await pullV1Tracks(channel.id, channel.firebase_id, pg)

		/** @type {import('$lib/types').Track[]} */
		const tracks = await r4.channels.readChannelTracks(slug)

		// Insert tracks
		await pg.transaction(async (tx) => {
			const CHUNK_SIZE = 50
			for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
				const chunk = tracks.slice(i, i + CHUNK_SIZE)
				const inserts = chunk.map(
					(track) => tx.sql`
	        INSERT INTO tracks (
	          id, channel_id, url, title, description,
	          discogs_url, created_at, updated_at, tags, mentions
	        )
	        VALUES (
	          ${track.id}, ${channel.id}, ${track.url},
	          ${track.title}, ${track.description},
	          ${track.discogs_url}, ${track.created_at}, ${track.updated_at},
	          ${track.tags}, ${track.mentions}
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
			log.log('pull_tracks', channel.slug, tracks?.length)
		})
		// Mark as successfully synced
		await pg.sql`update channels set busy = false, tracks_synced_at = CURRENT_TIMESTAMP, track_count = ${tracks.length} where slug = ${slug}`
	} catch (error) {
		// On error, just mark as not busy (tracks_synced_at stays NULL for retry)
		await pg.sql`update channels set busy = false where slug = ${slug}`
		throw error
	}
}

/**
 * Pull a single channel by slug from Radio4000 into local database
 * @param {string} slug - Channel slug
 */
export async function pullChannel(slug) {
	const channel = await r4.channels.readChannel(slug)
	await pg.sql`
			INSERT INTO channels (id, name, slug, description, image, created_at, updated_at)
			VALUES (
				${channel.id}, ${channel.name}, ${channel.slug},
				${channel.description}, ${channel.image},
				${channel.created_at}, ${channel.updated_at}
			)
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				slug = EXCLUDED.slug,
				description = EXCLUDED.description,
				image = EXCLUDED.image,
				updated_at = EXCLUDED.updated_at
				RETURNING *
		`
}

/**
 * Returns true if a channel's tracks need pulling
 * @param {string} slug - Channel slug
 * @returns {Promise<boolean>}
 */
export async function needsUpdate(slug) {
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

/** Pulls all channels into local db (v1+v2) */
export async function sync() {
	console.time('r4.sync sync')
	await Promise.all([
		pullChannels().catch((err) => log.error('pull_channels_error', err)),
		pullV1Channels().catch((err) => log.error('pull_v1_channels_error', err))
	])
	console.timeEnd('r4.sync sync')
}

/** Sync if no channels exist locally */
export async function autoSync() {
	const {rows} = await pg.sql`SELECT COUNT(*) as count FROM channels`
	const channelCount = parseInt(rows[0].count)
	if (channelCount) return
	log.log('autosync')
	await sync().catch((err) => log.error('auto_sync_error', err))
}
