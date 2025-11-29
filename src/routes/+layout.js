import {browser} from '$app/environment'
import {validateListeningState} from '$lib/broadcast.js'
import {logger} from '$lib/logger'
import {r4} from '$lib/r4'
import {r5} from '$lib/r5'
import {queryClient, initCollections} from './tanstack/collections'
import {appState} from '$lib/app-state.svelte'

// Disable server-side rendering for all routes by default. Otherwise we can't use pglite + indexeddb.
export const ssr = false

const log = logger.ns('layout').seal()

/** @type {import('@electric-sql/pglite/live').PGliteWithLive} */
let pg

/** Sync if no channels exist locally */
async function autoPull() {
	const {rows} = await pg.sql`SELECT COUNT(*) as count FROM channels`
	const channelCount = Number(rows[0].count)
	if (channelCount > 100) return
	log.log('autoPull')
	await r5.channels.pull().catch((err) => log.error('auto_sync_error', err))
}

async function preload() {
	if (!browser) {
		log.warn('preloading_failed_no_browser')
		return
	}
	log.debug('preloading')
	try {
		// await delay(60000)
		await r5.db.migrate()
		pg = await r5.db.getPg()
		await initCollections()
		await autoPull()
		// @ts-expect-error debugging
		window.r5 = {r5, r4, pg, appState, queryClient}

		// Validate listening state in background after UI loads
		validateListeningState().catch((err) => log.error('validate_listening_state_error', err))
	} catch (err) {
		log.error('preloading_error', err)
	} finally {
		// preloading = false
		log.debug('preloading_done')
	}
}

/** @type {import('./$types').LayoutLoad} */
export async function load() {
	return {
		preloading: preload(),
		preload
	}
}
