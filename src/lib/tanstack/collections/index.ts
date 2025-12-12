// Re-export all collections and their associated functions

// Shared utilities
export {queryClient} from './query-client'
export {log, txLog, offlineLog, completedIdempotencyKeys, getErrorMessage} from './utils'

// Local-only collections (localStorage)
export {trackMetaCollection, deleteTrackMeta, type TrackMeta} from './track-meta'
export {
	playHistoryCollection,
	addPlayHistoryEntry,
	endPlayHistoryEntry,
	clearPlayHistory,
	type PlayHistoryEntry
} from './play-history'
export {spamDecisionsCollection, type SpamDecision} from './spam-decisions'

// Synced collections (with offline support)
export {followsCollection, followsAPI, pullFollows, followChannel, unfollowChannel, type Follow} from './follows'
export {channelsCollection, channelsAPI, createChannel, updateChannel, deleteChannel, type Channel} from './channels'
export {
	tracksCollection,
	tracksAPI,
	getTrackWithMeta,
	addTrack,
	updateTrack,
	deleteTrack,
	batchUpdateTracksUniform,
	batchUpdateTracksIndividual,
	batchDeleteTracks,
	checkTracksFreshness,
	ensureTracksLoaded
} from './tracks'

// Offline executor
export {getOfflineExecutor} from './offline-executor'

// Demo collection for interactive guide
export {demoCollection, demoAPI, type DemoTodo} from './demo'
