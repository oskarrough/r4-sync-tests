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
		const tracks = await r5.tracks.pull({slug})
		console.log('here', channel, tracks)
		// if (!channels.length) error(404, 'Channel not found')
		return {channel, slug, search, order, dir}
	} catch (err) {
		console.log(err)
		console.log(err.message)
		error(404, `Channel not found: ${err}`)
	}
}
