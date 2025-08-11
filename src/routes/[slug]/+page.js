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
		const channels = await r5.channels.pull({slug})
		if (!channels.length) error(404, 'Channel not found')
		return {channel: channels[0], slug, search, order, dir}
	} catch {
		error(404, 'Channel not found')
	}
}
