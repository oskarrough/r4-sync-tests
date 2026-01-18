import {createCollection} from '@tanstack/svelte-db'
import {queryCollectionOptions} from '@tanstack/query-db-collection'
import {sdk} from '@radio4000/sdk'
import {queryClient} from './query-client'
import {log} from './utils'
import {appState} from '$lib/app-state.svelte'

/** @typedef {import('$lib/types').BroadcastWithChannel} BroadcastWithChannel */

export const broadcastsCollection = createCollection(
	queryCollectionOptions({
		queryKey: () => ['broadcasts'],
		queryClient,
		getKey: (/** @type {BroadcastWithChannel} */ item) => item.channel_id,
		staleTime: Infinity,
		queryFn: fetchBroadcastsWithChannel
	})
)

const BROADCAST_SELECT = `
	channel_id,
	track_id,
	track_played_at,
	channels:channels_with_tracks (*),
	tracks:channel_tracks!track_id (*)
`

async function fetchBroadcastsWithChannel() {
	const {data, error} = await sdk.supabase.from('broadcast').select(BROADCAST_SELECT)
	if (error) throw error
	syncBroadcastingState(data || [])
	return /** @type {BroadcastWithChannel[]} */ (data || [])
}

/**
 * Sync appState.broadcasting_channel_id from the broadcasts list
 * @param {BroadcastWithChannel[]} broadcasts
 */
function syncBroadcastingState(broadcasts) {
	const userChannelId = appState.channels?.[0]
	const isUserBroadcasting = userChannelId && broadcasts.some((b) => b.channel_id === userChannelId)
	appState.broadcasting_channel_id = isUserBroadcasting ? userChannelId : undefined
}

sdk.supabase
	.channel('broadcasts-realtime')
	.on('postgres_changes', {event: '*', schema: 'public', table: 'broadcast'}, async (payload) => {
		log.info('broadcasts realtime', {event: payload.eventType})

		if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
			const newData = /** @type {{channel_id: string}} */ (payload.new)
			const {data} = await sdk.supabase
				.from('broadcast')
				.select(BROADCAST_SELECT)
				.eq('channel_id', newData.channel_id)
				.single()
			if (data) {
				broadcastsCollection.utils.writeUpsert(/** @type {BroadcastWithChannel} */ (data))
				syncBroadcastingState([...broadcastsCollection.state.values()])
			}
		}

		if (payload.eventType === 'DELETE') {
			const oldData = /** @type {{channel_id: string}} */ (payload.old)
			broadcastsCollection.utils.writeDelete(oldData.channel_id)
			if (oldData.channel_id === appState.channels?.[0]) {
				appState.broadcasting_channel_id = undefined
			}
			syncBroadcastingState([...broadcastsCollection.state.values()])
		}
	})
	.subscribe((status) => {
		log.info('broadcasts subscription status', {status})
	})
