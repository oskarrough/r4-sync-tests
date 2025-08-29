import {r5} from '$lib/r5'

/** @type {import('./$types').PageLoad} */
export async function load({parent}) {
	await parent()
	const channels = (await r5.channels.local({limit: 1000})).filter(channel => channel.track_count > 20)
	return {channels}
}
