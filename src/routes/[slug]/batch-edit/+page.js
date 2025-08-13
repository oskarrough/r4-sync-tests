import {r5} from '$lib/r5'
import {error} from '@sveltejs/kit'
import {getEdits} from '$lib/api'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params}) {
	await parent()

	const {slug} = params

	let channel
	let tracks
	try {
		channel = (await r5.channels.pull({slug}))[0]
		if (!channel.tracks_synced_at) {
			tracks = await r5.tracks.pull({slug})
		} else {
			tracks = await r5.tracks({slug})
		}
	} catch {
		error(404, 'Channel not found')
	}

	let edits = await getEdits()

	return {
		slug,
		channel,
		tracks,
		edits
	}
}
