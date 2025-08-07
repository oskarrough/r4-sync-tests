import {appState} from '$lib/app-state.svelte'
import {ensureFollowers} from '$lib/api'

/** @type {import('./$types').PageLoad} */
export async function load({parent}) {
	await parent()

	const followerId = appState.channels?.[0] || 'local-user'
	const followings = await ensureFollowers(followerId)

	return {followings}
}
