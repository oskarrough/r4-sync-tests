import {error} from '@sveltejs/kit'
import {r5} from '$lib/r5'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params, url}) {
	await parent()

	const {slug} = params
	const search = url.searchParams.get('search') || ''
	const order = url.searchParams.get('order') || 'created'
	const dir = url.searchParams.get('dir') || 'desc'

	try {
		const channel = (await r5.channels.pull({slug}))[0]
		return {channel, slug, search, order, dir}
	} catch (err) {
		console.error(err)
		error(404, `Channel not found: ${err.message}`)
	}
}
