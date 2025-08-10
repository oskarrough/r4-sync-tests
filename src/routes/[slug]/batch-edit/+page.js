import {pg} from '$lib/db'
import {r5} from '$lib/experimental-api'
import {error} from '@sveltejs/kit'
import {getEdits} from '$lib/api'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params}) {
	await parent()

	const {slug} = params

	let channel = {},
		tracks = [],
		editCount = 0,
		edits = []

	try {
		channel = await r5.channels.pull({slug})
	} catch {
		error(404, 'Channel not found')
	}

	try {
		const tracksResult =
			await pg.sql`SELECT * from tracks where channel_id = ${channel.id} ORDER BY created_at DESC`
		tracks = tracksResult.rows
	} catch (error) {
		error(400, `Error fetching tracks: ${error.message}`)
	}

	const editCountResult = await pg.sql`SELECT COUNT(*) as count FROM track_edits`
	editCount = editCountResult.rows[0]?.count || 0
	edits = await getEdits()

	return {
		channel,
		slug,
		editCount,
		edits,
		tracks
	}
}
