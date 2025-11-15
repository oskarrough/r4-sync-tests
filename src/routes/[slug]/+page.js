import {r5} from '$lib/r5'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params, url}) {
	await parent()

	const {slug} = params
	const search = url.searchParams.get('search') || ''
	const order = url.searchParams.get('order') || 'created'
	const dir = url.searchParams.get('dir') || 'desc'

	// Pull channel but don't block on errors - handle in component
	console.log('[load]', slug)
	let channels = []

	try {
		channels = await r5.channels.pull({slug})
	} catch (err) {
		console.error('Error pulling channel:', err)
		channels = []
	}

	const channel = channels[0] || null
	console.log('[load] returning:', channel?.name)

	return {channel, slug, search, order, dir}
}
