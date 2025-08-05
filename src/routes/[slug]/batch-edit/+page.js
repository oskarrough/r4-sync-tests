import {needsUpdate, pullChannel, pullTracks} from '$lib/sync'
import {pg} from '$lib/db'
import {error} from '@sveltejs/kit'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params}) {
	// Make sure we have the db.
	await parent()
	if (!pg) error(500, 'Database connection error')

	// Get URL params
	const {slug} = params

	/** @type {import('$lib/types').Channel} */
	let channel = (await pg.query('SELECT * FROM channels WHERE slug = $1', [slug])).rows[0]

	if (!channel) {
		try {
			await pullChannel(slug)
			channel = (await pg.query('SELECT * FROM channels WHERE slug = $1', [slug])).rows[0]
		} catch (err) {
			console.error('batch_edit:load_error', err)
		}
	}

	if (!channel) error(404, 'Channel not found')

	if (channel && (await needsUpdate(slug))) pullTracks(slug)

	return {
		channel,
		slug
	}
}
