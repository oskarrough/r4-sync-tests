import {r5} from '$lib/r5'

/** @type {import('./$types').PageLoad} */
export async function load({parent, params}) {
	// why do we need to await parent? do we?
	await parent()

	const channels = await r5.channels.pull({slug: params.slug})
	return {
		channel: channels[0]
	}
}
