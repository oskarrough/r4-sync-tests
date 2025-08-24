export const ssr = false

/** @type {import('./$types').PageLoad} */
export async function load({parent, url}) {
	await parent()
	return {
		display: url.searchParams.get('display')
	}
}
