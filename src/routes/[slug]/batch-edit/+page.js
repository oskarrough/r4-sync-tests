import {loadChannel} from '$lib/api'
import {error} from '@sveltejs/kit'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params}) {
	await parent()

	const {slug} = params

	try {
		const channel = await loadChannel(slug)
		return {channel, slug}
	} catch {
		error(404, 'Channel not found')
	}
}
