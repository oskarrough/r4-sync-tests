import {browser} from '$app/environment'
import {pg, migrateDb} from '$lib/db'
import {r4} from '$lib/r4'
import {r5} from '$lib/r5'
import {initAppState} from '$lib/app-state.svelte'
import {logger} from '$lib/logger'

const log = logger.ns('layout').seal()

// Disable server-side rendering for all routes by default. Otherwise we can't use pglite + indexeddb.
export const ssr = false

/** @type {import('./$types').LayoutLoad} */
export async function load() {
	log.log('load')
	let preloading = true

	if (browser) {
		try {
			await migrateDb()
			await initAppState()
			//await autoSync()
			// @ts-expect-error debugging
			window.r5 = {pg, r4, r5}
		} catch (err) {
			log.error('load_error', err)
		} finally {
			preloading = false
			log.log('load_done')
		}
	}

	return {pg, r4, preloading}
}
