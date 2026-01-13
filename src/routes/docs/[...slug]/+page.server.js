import {readFile, readdir} from 'node:fs/promises'

export const prerender = true

export async function entries() {
	const files = await readdir('docs')
	return files.filter((f) => f.endsWith('.md')).map((f) => ({slug: f.replace('.md', '')}))
}

import {Marked} from 'marked'
import {error} from '@sveltejs/kit'

const renderer = {
	link({href, title, text}) {
		if (href?.endsWith('.md')) {
			href = `/docs/${href.replace('.md', '')}`
		}
		const titleAttr = title ? ` title="${title}"` : ''
		return `<a href="${href}"${titleAttr}>${text}</a>`
	}
}

const marked = new Marked({renderer})

export async function load({params}) {
	const slug = params.slug || 'index'
	const filename = slug.endsWith('.md') ? slug : `${slug}.md`
	const filepath = `docs/${filename}`

	try {
		const content = await readFile(filepath, 'utf-8')
		const html = await marked.parse(content)

		const files = await readdir('docs')
		const docs = files
			.filter((f) => f.endsWith('.md'))
			.map((f) => f.replace('.md', ''))
			.sort()

		return {html, slug, docs}
	} catch {
		error(404, `Doc not found: ${filename}`)
	}
}
