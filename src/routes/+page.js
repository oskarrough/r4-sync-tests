import {pg} from '$lib/db'

// @todo importing this breaks svelte because of ssr i dont get it,
// since it is disabled. It's something with the `pg` variable at the root.
// import {pg} from '$lib/db'

export const ssr = false

/** @type {import('./$types').PageLoad} */
export async function load({parent, url}) {
	await parent()

	const channels = (await pg.sql`SELECT * FROM channels ORDER BY created_at DESC`).rows

	return {
		channels,
		display: url.searchParams.get('display')
	}
}
