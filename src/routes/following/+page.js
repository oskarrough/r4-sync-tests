import {ensureFollowers} from '$lib/api'
import {appState} from '$lib/app-state.svelte'

/** @type {import('./$types').PageLoad} */
export async function load({parent}) {
	const {preload} = await parent()
	await preload()

	const followerId = appState.channels?.[0] || 'local-user'
	const followings = await ensureFollowers(followerId)

	return {followings}
}
