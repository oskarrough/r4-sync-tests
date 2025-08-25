import {error} from '@sveltejs/kit'
import {pg} from '$lib/r5/db'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params}) {
	// Make sure we have the db.
	await parent()
	if (!pg) error(500, 'Database connection error')

	const {slug} = params

	/** @type {import('$lib/types').Channel} */
	const channel = (await pg.query('SELECT * FROM channels WHERE slug = $1', [slug])).rows[0]

	if (!channel) error(404, 'Channel not found')

	// Get all track URLs for this channel
	const tracks = await pg.query('SELECT url FROM tracks WHERE channel_id = $1 ORDER BY created_at DESC', [channel.id])

	return {
		channel,
		trackUrls: tracks.rows.map((row) => row.url)
	}
}
