import {pg} from '$lib/r5/db'

/**
 * Sets up a live query subscription that auto-cleans up with Svelte 5 $effect
 * Use inside $effect(() => { liveQuery(...) })
 * @param {string} query - SQL query string
 * @param {any[]} params - Query parameters
 * @param {(result: any) => void} callback - Callback for query results
 */
export function liveQuery(query, params, callback) {
	let cancelled = false
	let subscription = null

	// Start the subscription
	pg.live
		.query(query, params, (result) => {
			if (!cancelled) {
				callback(result)
			}
		})
		.then((sub) => {
			subscription = sub
		})

	// Return cleanup function for $effect
	return () => {
		cancelled = true
		subscription?.unsubscribe()
	}
}

/**
 * Sets up an incremental live query subscription that auto-cleans up with Svelte 5 $effect
 * Use inside $effect(() => { setupIncrementalLiveQuery(...) })
 * @param {string} query - SQL query string
 * @param {any[]} params - Query parameters
 * @param {string} key - Key field for incremental updates
 * @param {(result: any) => void} callback - Callback for query results
 */
export function incrementalLiveQuery(query, params, key, callback) {
	let cancelled = false
	let subscription = null

	// Start the subscription
	pg.live
		.incrementalQuery(query, params, key, (result) => {
			if (!cancelled) {
				callback(result)
			}
		})
		.then((sub) => {
			subscription = sub
		})

	// Return cleanup function for $effect
	return () => {
		cancelled = true
		subscription?.unsubscribe()
	}
}
