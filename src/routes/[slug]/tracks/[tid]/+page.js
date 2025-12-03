/** @type {import('./$types').PageLoad} */
export function load({params}) {
	return {slug: params.slug, tid: params.tid}
}
