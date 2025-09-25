import {r5} from '$lib/r5'

export async function load({params, parent}) {
	const {slug} = params
	await parent() // Ensure layout preloading is done

	const channels = await r5.channels.local({slug})
	const channel = channels[0] || null

	return {
		slug,
		channel
	}
}
