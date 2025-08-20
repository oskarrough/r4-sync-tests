import {pg} from '$lib/r5/db'
import {batcher} from '$lib/batcher'
import {logger} from '$lib/logger'

/** @typedef {{status: string, value: {id: string, tags: string[], duration: number, title: string, categoryId: string, description: string, publishedAt: string}}} YouTubeVideo */

const log = logger.ns('metadata:youtube').seal()

/** @param {string[]} ytids */
async function getTracksToUpdate(ytids) {
	const res = await pg.sql`
			SELECT id, ytid(url) as ytid
			FROM tracks_with_meta 
			WHERE 
				ytid(url) IS NOT NULL
				AND ytid(url) = ANY(${ytids})
				AND youtube_data IS NULL
	`
	if (res.rows.length === 0) return []
	return res.rows
}

/**
 * Fetch YouTube metadata for channel tracks and save to track_meta
 * @param {string} channelId Channel ID
 * @returns {Promise<Object[]>} Fetched metadata
 */
export async function pullFromChannel(channelId) {
	const {rows} =
		await pg.sql`select ytid(url) as ytid from tracks_with_meta where channel_id = ${channelId}`
	const ytids = rows.map((r) => r.ytid)
	return await pull(ytids)
}

/**
 * Fetch YouTube metadata for single video and save to track_meta
 * @param {string} ytid YouTube video ID
 * @returns {Promise<Object|null>} Fetched metadata
 */
export async function pullSingle(ytid) {
	const ytids = [ytid]
	return (await pull(ytids))[0] || null
}

/**
 * Fetch YouTube metadata and save to track_meta
 * @param {string[]} ytids YouTube video IDs
 * @returns {Promise<Object[]>} Fetched metadata
 */
export async function pull(ytids) {
	const items = await getTracksToUpdate(ytids)
	if (items.length === 0) {
		log.info('all tracks already have metadata')
		return []
	}

	// Batch fetch YouTube metadata
	const batches = []
	for (let i = 0; i < ytids.length; i += 50) {
		batches.push(ytids.slice(i, i + 50))
	}

	const results = await batcher(
		batches,
		async (batch) => {
			const response = await fetch('/api/track-meta', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({ids: batch})
			})
			if (!response.ok) throw new Error(`API error: ${response.status}`)
			return await response.json()
		},
		{batchSize: 1, withinBatch: 3}
	)

	// Flatten batch results
	const videos = results
		.filter((result) => result.ok)
		.flatMap((result) => result.value)
		.filter((video) => video?.duration)

	await pg.transaction(async (tx) => {
		for (const video of videos) {
			await tx.sql`
				INSERT INTO track_meta (ytid, duration, youtube_data, youtube_updated_at, updated_at)
				VALUES (${video.id}, ${video.duration}, ${JSON.stringify(video)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
				ON CONFLICT (ytid) DO UPDATE SET
					duration = EXCLUDED.duration,
					youtube_data = EXCLUDED.youtube_data,
					youtube_updated_at = EXCLUDED.youtube_updated_at,
					updated_at = EXCLUDED.updated_at
			`
		}
	})

	log.info(`processed ${items.length} tracks`)
	return results
}

/**
 * Read YouTube metadata from local track_meta
 * @param {string[]} ytids YouTube video IDs
 * @returns {Promise<Object[]>} Local metadata
 */
export async function local(ytids) {
	const res = await pg.sql`
		SELECT * FROM track_meta 
		WHERE ytid = ANY(${ytids}) AND youtube_data IS NOT NULL
	`
	return res.rows
}
