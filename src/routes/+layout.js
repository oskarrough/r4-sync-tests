import {browser} from '$app/environment'
import {validateListeningState} from '$lib/broadcast.js'
import {logger} from '$lib/logger'
import {sdk} from '@radio4000/sdk'
import {queryClient, initCollections, tracksCollection, channelsCollection} from './tanstack/collections'
import {fetchAllChannels} from '$lib/api/seed'
import {cacheReady} from './tanstack/persistence'
import {appState} from '$lib/app-state.svelte'

// Disable server-side rendering for all routes by default. Otherwise we can't use pglite + indexeddb.
export const ssr = false

const log = logger.ns('layout').seal()

async function preload() {
	if (!browser) {
		log.warn('preloading_failed_no_browser')
		return
	}
	log.debug('preloading')
	try {
		await cacheReady
		await initCollections()
		// Prefetch all channels so search works immediately
		await queryClient.prefetchQuery({
			queryKey: ['channels'],
			queryFn: fetchAllChannels,
			staleTime: 24 * 60 * 60 * 1000 // 24h - match channelsCollection
		})

		// @ts-expect-error debugging
		window.r5 = {sdk, appState, queryClient, tracksCollection, channelsCollection}

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
