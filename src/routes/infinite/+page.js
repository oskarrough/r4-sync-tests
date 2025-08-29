import {r5} from '$lib/r5'

/** @type {import('./$types').PageLoad} */
export async function load({parent}) {
	await parent()
	const channels = await r5.channels.local({limit: 1000})
	return {channels}
}
