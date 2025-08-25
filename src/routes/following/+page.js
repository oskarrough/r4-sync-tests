import {ensureFollowers} from '$lib/api'
import {appState} from '$lib/app-state.svelte'

/** @type {import('./$types').PageLoad} */
export async function load({parent}) {
	await parent()

	const followerId = appState.channels?.[0] || 'local-user'
	const followings = await ensureFollowers(followerId)

	return {followings}
}
