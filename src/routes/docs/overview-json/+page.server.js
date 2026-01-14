import {readFile} from 'node:fs/promises'
import {error} from '@sveltejs/kit'

export const prerender = true

export async function load() {
	try {
		const raw = await readFile('docs/overview.json', 'utf-8')
		return {overview: JSON.parse(raw)}
	} catch (err) {
		error(500, `Failed to load docs/overview.json: ${err?.message ?? 'unknown error'}`)
	}
}
