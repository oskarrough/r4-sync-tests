import {r5} from '$lib/r5'
import {error} from '@sveltejs/kit'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params, url}) {
	await parent()

	const {slug} = params
	const search = url.searchParams.get('search') || ''
	const order = url.searchParams.get('order') || 'created'
	const dir = url.searchParams.get('dir') || 'desc'

	try {
		const channel = (await r5.channels.pull({slug}))[0]

		// Return tracks promise without awaiting - let page stream it in
		const tracksPromise = !channel.tracks_synced_at
			? r5.tracks.pull({slug})
			: r5.tracks.local({slug})

		return {channel, slug, search, order, dir, tracksPromise}
	} catch (err) {
		console.error(err)
		error(404, `Channel not found: ${err.message}`)
	}
}
