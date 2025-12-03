import {batcher} from '$lib/batcher'
import {logger} from '$lib/logger'
import {trackMetaCollection} from '../../routes/tanstack/collections'

/** @typedef {{status: string, value: {id: string, tags: string[], duration: number, title: string, categoryId: string, description: string, publishedAt: string}}} YouTubeVideo */

const log = logger.ns('metadata/youtube').seal()

/** @param {string[]} ytids */
function getTracksToUpdate(ytids) {
	return ytids.filter((ytid) => !trackMetaCollection.get(ytid)?.youtube_data)
}

/**
 * Fetch YouTube metadata for channel tracks
 * @deprecated Use pullSingle or pull with ytids from tracksCollection instead
 * @param {string[]} ytids YouTube video IDs from channel tracks
 * @returns {Promise<Object[]>} Fetched metadata
 */
export async function pullFromChannel(ytids) {
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
 * Fetch YouTube metadata and save to track_meta collection
 * @param {string[]} ytids YouTube video IDs
 * @returns {Promise<Object[]>} Fetched metadata
 */
export async function pull(ytids) {
	const toUpdate = getTracksToUpdate(ytids)
	if (toUpdate.length === 0) {
		log.info('all tracks already have metadata')
		return []
	}

	// Batch fetch YouTube metadata
	const batches = []
	for (let i = 0; i < toUpdate.length; i += 50) {
		batches.push(toUpdate.slice(i, i + 50))
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

	// Save to collection
	for (const video of videos) {
		const existing = trackMetaCollection.get(video.id)
		if (existing) {
			trackMetaCollection.update(video.id, (draft) => {
				draft.duration = video.duration
				draft.youtube_data = video
			})
		} else {
			trackMetaCollection.insert({ytid: video.id, duration: video.duration, youtube_data: video})
		}
	}

	log.info(`processed ${toUpdate.length} tracks`)
	return results
}

/**
 * Read YouTube metadata from local track_meta collection
 * @param {string[]} ytids YouTube video IDs
 * @returns {Object[]} Local metadata with youtube_data
 */
export function local(ytids) {
	return ytids.map((id) => trackMetaCollection.get(id)).filter((m) => m?.youtube_data)
}
