import {error} from '@sveltejs/kit'
import {r5} from '$lib/r5'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params}) {
	await parent()

	const {slug} = params

	try {
		const channel = (await r5.channels.pull({slug}))[0]

		if (!channel) {
			error(404, `Channel not found: ${slug}`)
		}

		const tracks = (await r5.tracks.pull({ slug }))

		return {channel, tracks}
	} catch (err) {
		console.error(err)
		error(404, `Channel not found: ${err.message}`)
	}
}
