/** @type {import('./$types').PageLoad} */
export async function load({parent}) {
	const {channel, slug} = await parent()
	return {
		channel,
		slug
	}
}
