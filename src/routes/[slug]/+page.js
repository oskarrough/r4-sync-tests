import {loadChannel} from '$lib/api'
import {error} from '@sveltejs/kit'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params, url}) {
	await parent()

	const {slug} = params
	const search = url.searchParams.get('search') || ''
	const order = url.searchParams.get('order') || 'created'
	const dir = url.searchParams.get('dir') || 'desc'

	try {
		const channel = await loadChannel(slug)
		return {channel, slug, search, order, dir}
	} catch {
		error(404, 'Channel not found')
	}
}
