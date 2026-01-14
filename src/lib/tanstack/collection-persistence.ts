/** Direct collection persistence to IndexedDB, bypassing TanStack Query cache. */
// TEMP DISABLED - debugging navigation/data issues
// TODO: Re-enable when data flow issues are resolved
export const collectionsHydrated: Promise<void> = Promise.resolve()

// export const collectionsHydrated: Promise<void> = browser
// 	? (async () => {
// 			const [tracksCount, channelsCount] = await Promise.all([
// 				hydrateCollection(tracksCollection, IDB_KEY_TRACKS),
// 				hydrateCollection(channelsCollection, IDB_KEY_CHANNELS)
// 			]).catch((err) => {
// 				log.warn('hydration error', {error: err})
// 				return [0, 0]
// 			})
//
// 			log.info('hydrated', {tracks: tracksCount, channels: channelsCount})
//
// 			persistCollection(tracksCollection, IDB_KEY_TRACKS)
// 			persistCollection(channelsCollection, IDB_KEY_CHANNELS)
// 		})()
// 	: Promise.resolve()
