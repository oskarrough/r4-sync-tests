import {readFile, readdir} from 'node:fs/promises'
import {Marked} from 'marked'
import {error} from '@sveltejs/kit'

export const prerender = true

const marked = new Marked({
	renderer: {
		link({href, title, text}) {
			if (href?.endsWith('.md')) href = `/docs/${href.replace('.md', '')}`
			const titleAttr = title ? ` title="${title}"` : ''
			return `<a href="${href}"${titleAttr}>${text}</a>`
		}
	}
})

async function getDocSlugs() {
	const files = await readdir('docs')
	return files.filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''))
}

export async function entries() {
	const slugs = await getDocSlugs()
	return [{slug: ''}, ...slugs.map((slug) => ({slug}))]
}

export async function load({params}) {
	const slug = params.slug || 'index'

	try {
		const content = await readFile(`docs/${slug}.md`, 'utf-8')
		const [html, docs] = await Promise.all([marked.parse(content), getDocSlugs()])
		return {html, slug, docs: docs.sort()}
	} catch {
		error(404, `Doc not found: ${slug}.md`)
	}
}
