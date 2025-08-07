import {pg} from '$lib/db'
import {error} from '@sveltejs/kit'
import {logger} from '$lib/logger'
import {pullTracks} from '$lib/sync'

/**
 * Wait for the db to be ready, query track + channel locally
 * @type {import('./$types').PageLoad} */
export async function load({parent, params}) {
	await parent()
	if (!pg) error(500, 'Database connection error')

	const {slug, tid} = params

	/** @type {{rows: import('$lib/types').Track[]}} */
	const {rows} = await pg.query('SELECT * FROM tracks_with_meta WHERE id = $1 limit 1', [tid])
	let track = rows[0]
	if (!rows.length) {
		await pullTracks(slug)
		const results = await pg.query('SELECT * FROM tracks_with_meta WHERE id = $1 limit 1', [tid])
		if (!results.rows) error(404, 'Track not found')
		track = results.rows[0]
	}

	/** @type {{rows: import('$lib/types').Channel[]}} */
	const {rows: channelRows} = await pg.query('SELECT * FROM channels WHERE id = $1 limit 1', [
		track.channel_id
	])
	if (!channelRows.length) error(404, 'Channel not found')
	const channel = channelRows[0]

	// Verify the slug matches the channel
	if (!channel || channel.slug !== slug) {
		error(404, 'Track not found in this channel')
	}

	logger.log('track_page:load', {track, channel})

	return {
		track,
		channel,
		slug,
		tid
	}
}
