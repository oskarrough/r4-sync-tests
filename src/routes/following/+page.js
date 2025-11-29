/** @type {import('./$types').PageLoad} */
export async function load({parent}) {
	const {preload} = await parent()
	await preload()
	// Data comes from followsCollection + channelsCollection in the component
}
