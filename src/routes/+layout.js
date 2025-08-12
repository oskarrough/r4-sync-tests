import {browser} from '$app/environment'
import {pg, migrateDb} from '$lib/db'
import {r4} from '$lib/r4'
import {r5} from '$lib/r5'
import {initAppState} from '$lib/app-state.svelte'
import {logger} from '$lib/logger'

// Disable server-side rendering for all routes by default. Otherwise we can't use pglite + indexeddb.
export const ssr = false

const log = logger.ns('layout').seal()

/** Sync if no channels exist locally */
async function autoPull() {
	const {rows} = await pg.sql`SELECT COUNT(*) as count FROM channels`
	const channelCount = parseInt(rows[0].count)
	if (channelCount > 100) return
	log.log('autoPull')
	await r5.channels.pull().catch((err) => log.error('auto_sync_error', err))
}

/** @type {import('./$types').LayoutLoad} */
export async function load() {
	log.log('preloading')
	let preloading = true

	if (browser) {
		try {
			await migrateDb()
			await initAppState()
			await autoPull()
			// @ts-expect-error debugging
			window.r5 = {pg, r5, r4}
		} catch (err) {
			log.error('preloading_error', err)
		} finally {
			preloading = false
			log.log('preloading_done')
		}
	}

	return {pg, r4, preloading}
}
