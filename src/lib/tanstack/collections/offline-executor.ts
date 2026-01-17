import {startOfflineExecutor, IndexedDBAdapter} from '@tanstack/offline-transactions'
import {offlineLog} from './utils'
import {tracksCollection, tracksAPI} from './tracks'
import {channelsCollection, channelsAPI} from './channels'
import {followsCollection, followsAPI} from './follows'
import {IDB_DATABASES} from '$lib/storage-keys'

let _executor: ReturnType<typeof startOfflineExecutor> | null = null

export function getOfflineExecutor() {
	if (!_executor) {
		_executor = startOfflineExecutor({
			collections: {tracks: tracksCollection, channels: channelsCollection, follows: followsCollection},
			storage: new IndexedDBAdapter(IDB_DATABASES.offlineMutations, 'transactions'),
			mutationFns: {
				syncTracks: tracksAPI.syncTracks,
				syncChannels: channelsAPI.syncChannels,
				syncFollows: followsAPI.syncFollows
			},
			onLeadershipChange: (isLeader) => offlineLog.debug('leader', {isLeader}),
			onStorageFailure: (diagnostic) => offlineLog.warn('storage failed', diagnostic)
		})
	}
	return _executor
}
