/**
 * Patched version of @tanstack/svelte-db useLiveQuery
 * Fix: await tick() before state mutations in subscribeChanges callback
 * to avoid state_unsafe_mutation errors during render
 *
 * Also exports useCachedLiveQuery for cache-first pattern
 */
import {untrack} from 'svelte'
// import {tick} from 'svelte'
import {logger} from '$lib/logger'

const log = logger.ns('livequery').seal()
import {SvelteMap} from 'svelte/reactivity'
import {BaseQueryBuilder, createLiveQueryCollection} from '@tanstack/db'

function toValue(value) {
	if (typeof value === `function`) {
		return value()
	}
	return value
}

export function useLiveQuery(configOrQueryOrCollection, deps = []) {
	const collection = $derived.by(() => {
		let unwrappedParam = configOrQueryOrCollection
		try {
			const potentiallyUnwrapped = toValue(configOrQueryOrCollection)
			if (potentiallyUnwrapped !== configOrQueryOrCollection) {
				unwrappedParam = potentiallyUnwrapped
			}
		} catch {
			unwrappedParam = configOrQueryOrCollection
		}

		const isCollection =
			unwrappedParam &&
			typeof unwrappedParam === `object` &&
			typeof unwrappedParam.subscribeChanges === `function` &&
			typeof unwrappedParam.startSyncImmediate === `function` &&
			typeof unwrappedParam.id === `string`

		if (isCollection) {
			if (unwrappedParam.status === `idle`) {
				unwrappedParam.startSyncImmediate()
			}
			return unwrappedParam
		}

		deps.forEach((dep) => {
			toValue(dep)
		})

		if (typeof unwrappedParam === `function`) {
			const queryBuilder = new BaseQueryBuilder()
			const result = unwrappedParam(queryBuilder)
			if (result === undefined || result === null) {
				return null
			}
			return createLiveQueryCollection({
				query: unwrappedParam,
				startSync: true
			})
		} else {
			return createLiveQueryCollection({
				...unwrappedParam,
				startSync: true
			})
		}
	})

	const state = new SvelteMap()
	let internalData = $state([])
	let status = $state(collection ? collection.status : `disabled`)

	const syncDataFromCollection = (currentCollection) => {
		untrack(() => {
			internalData = []
			internalData.push(...Array.from(currentCollection.values()))
		})
	}

	let currentUnsubscribe = null

	$effect(() => {
		const currentCollection = collection

		if (!currentCollection) {
			status = `disabled`
			untrack(() => {
				state.clear()
				internalData = []
			})
			if (currentUnsubscribe) {
				currentUnsubscribe()
				currentUnsubscribe = null
			}
			return
		}

		log.debug('effect run', {collectionStatus: currentCollection.status, collectionId: currentCollection.id})
		status = currentCollection.status

		if (currentUnsubscribe) {
			currentUnsubscribe()
		}

		untrack(() => {
			state.clear()
			for (const [key, value] of currentCollection.entries()) {
				state.set(key, value)
			}
		})

		syncDataFromCollection(currentCollection)

		currentCollection.onFirstReady(() => {
			status = currentCollection.status
		})

		const subscription = currentCollection.subscribeChanges(
			(changes) => {
				// Wait for current render to complete before mutating state
				// await tick()  // Commented out to test if still needed after deps update

				untrack(() => {
					for (const change of changes) {
						switch (change.type) {
							case `insert`:
							case `update`:
								state.set(change.key, change.value)
								break
							case `delete`:
								state.delete(change.key)
								break
						}
					}
				})

				syncDataFromCollection(currentCollection)
				status = currentCollection.status
			},
			{
				includeInitialState: true
			}
		)

		currentUnsubscribe = subscription.unsubscribe.bind(subscription)

		if (currentCollection.status === `idle` || currentCollection.status === `loading`) {
			log.debug('calling preload', {
				status: currentCollection.status,
				id: currentCollection.id,
				config: currentCollection.config,
				isLoadingSubset: currentCollection.isLoadingSubset
			})
			currentCollection
				.preload()
				.then(() => log.debug('preload resolved', {status: currentCollection.status, id: currentCollection.id}))
				.catch((err) => log.error('preload failed', err))
		}

		return () => {
			if (currentUnsubscribe) {
				currentUnsubscribe()
				currentUnsubscribe = null
			}
		}
	})

	return {
		get state() {
			return state
		},
		get data() {
			const currentCollection = collection
			if (currentCollection) {
				const config = currentCollection.config
				if (config.singleResult) {
					return internalData[0]
				}
			}
			return internalData
		},
		get collection() {
			return collection
		},
		get status() {
			return status
		},
		get isLoading() {
			return status === `loading`
		},
		get isReady() {
			return status === `ready` || status === `disabled`
		},
		get isIdle() {
			return status === `idle`
		},
		get isError() {
			return status === `error`
		},
		get isCleanedUp() {
			return status === `cleaned-up`
		}
	}
}
