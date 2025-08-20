import {r4} from '$lib/r4'
import {pg} from '$lib/r5/db'
import {logger} from '$lib/logger'
import {playTrack} from '$lib/api'
import {r5} from '$lib/r5'
import {appState} from '$lib/app-state.svelte'

const log = logger.ns('broadcast').seal()

/** @type {any} */
let broadcastSyncChannel = null

/** @param {string} channelId */
export async function joinBroadcast(channelId) {
	try {
		// First get current state
		const {data} = await r4.sdk.supabase
			.from('broadcast')
			.select('*')
			.eq('channel_id', channelId)
			.single()
			.throwOnError()
		await syncPlayBroadcast(data)

		// Then subscribe to changes
		startBroadcastSync(channelId)
		log.log('joined', {channelId})
	} catch (error) {
		log.error('join_failed', {
			channelId,
			error: /** @type {Error} */ (error).message
		})
	}
}

export function leaveBroadcast() {
	stopBroadcastSync()
	appState.listening_to_channel_id = undefined
	log.log('left')
}

/** Start broadcasting for the current user */
export async function startBroadcast(channelId, trackId) {
	log.log('start_requested', {channelId, trackId})
	await createRemoteBroadcast(channelId, trackId)
}

/** Stop broadcasting for the current user */
export async function stopBroadcast(channelId) {
	log.log('stop_requested', {channelId})
	await deleteRemoteBroadcast(channelId)
}

/** Update the track while broadcasting */
export async function updateBroadcast(channelId, trackId) {
	log.log('update_requested', {channelId, trackId})
	await updateRemoteBroadcastTrack(channelId, trackId)
}

/**
 * Sync local broadcast state with remote broadcast data
 * @param {import('$lib/types').BroadcastWithChannel[]} broadcasts
 * @param {string|undefined} userChannelId
 */
export function syncLocalBroadcastState(broadcasts, userChannelId) {
	if (!userChannelId) return

	const userBroadcast = broadcasts.find((b) => b.channel_id === userChannelId)
	const wasLocallyBroadcasting = !!appState.broadcasting_channel_id
	const isRemotelyBroadcasting = !!userBroadcast

	if (isRemotelyBroadcasting && !wasLocallyBroadcasting) {
		log.log('started_remotely', {userChannelId})
		appState.broadcasting_channel_id = userChannelId
	} else if (!isRemotelyBroadcasting && wasLocallyBroadcasting) {
		log.log('stopped_remotely', {userChannelId})
		appState.broadcasting_channel_id = null
	}
}

/**
 * Helper to upsert a broadcast record
 */
async function upsertRemoteBroadcast(channelId, trackId) {
	return r4.sdk.supabase
		.from('broadcast')
		.upsert({
			channel_id: channelId,
			track_id: trackId,
			track_played_at: new Date().toISOString()
		})
		.throwOnError()
}

/**
 * @param {string} channelId
 * @param {string} [trackId]
 */
async function createRemoteBroadcast(channelId, trackId) {
	if (!trackId) {
		log.log('skipped_no_track', {channelId})
		return
	}

	// Check if track is from v1 channel - these can't be broadcast
	const channel = (await pg.sql`SELECT source, slug FROM channels where id = ${channelId}`).rows[0]
	if (channel.source === 'v1') {
		log.error('failed_v1_track', {channelId, trackId, channel})
		throw new Error('Cannot broadcast v1 channels')
	}

	await upsertRemoteBroadcast(channelId, trackId)
	log.log('created', {channelId, trackId})
}

/**
 * @param {string|null} channelId
 */
async function deleteRemoteBroadcast(channelId) {
	if (!channelId) return
	try {
		await r4.sdk.supabase.from('broadcast').delete().eq('channel_id', channelId).throwOnError()
		log.log('deleted remote broadcast', {channelId})
	} catch (error) {
		log.error('failed to delete remote broadcast', {
			channelId,
			error: /** @type {Error} */ (error).message
		})
	}
}

/**
 * @param {string|null} channelId
 * @param {string|null} trackId
 */
async function updateRemoteBroadcastTrack(channelId, trackId) {
	try {
		await r4.sdk.supabase
			.from('broadcast')
			.update({
				track_id: trackId,
				track_played_at: new Date().toISOString()
			})
			.eq('channel_id', channelId)
			.throwOnError()
		log.log('update', {channelId, trackId})
	} catch (error) {
		log.error('update_error', {
			channelId,
			trackId,
			error: /** @type {Error} */ (error).message
		})
	}
}

/**
 * Fetch missing channel and tracks for a track ID
 */
async function fetchChannelAndTracks(trackId) {
	const {data} = await r4.sdk.supabase
		.from('channel_track')
		.select('channels(slug)')
		.eq('track_id', trackId)
		.single()
		.throwOnError()
	// @ts-expect-error supabase
	const slug = data?.channels?.slug
	if (!slug) throw new Error('No channel found for track')

	await r5.channels.pull({slug})
	await r5.tracks.pull({slug})
	return slug
}

// ============================================
// SYNC & REALTIME
// ============================================

/** @param {string} channelId */
function startBroadcastSync(channelId) {
	stopBroadcastSync()

	log.log('starting_sync', {channelId})

	broadcastSyncChannel = r4.sdk.supabase
		.channel(`broadcast:${channelId}`)
		.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'broadcast',
				filter: `channel_id=eq.${channelId}`
			},
			(payload) => {
				const broadcast = payload.new
				log.log('change_received', {
					channelId,
					track_id: broadcast.track_id,
					track_played_at: broadcast.track_played_at,
					payload_event: payload.eventType
				})
				syncPlayBroadcast(broadcast)
			}
		)
		.subscribe((status) => {
			log.log('subscription_status', {channelId, status})
		})
}

export function stopBroadcastSync() {
	if (broadcastSyncChannel) {
		log.log('stopping_sync')
		broadcastSyncChannel.unsubscribe()
		broadcastSyncChannel = null
	}
}

/** @param {import('$lib/types').Broadcast} broadcast */
export async function syncPlayBroadcast(broadcast) {
	const {track_id, channel_id} = broadcast

	// Try to play directly
	try {
		await playTrack(track_id, '', 'broadcast_sync')
		appState.listening_to_channel_id = channel_id
		log.log('play_success', {track_id, channel_id})
		return true
	} catch (error) {
		log.log('play_failed', {track_id, error: /** @type {Error} */ (error).message})
	}

	// Fallback: fetch channel and retry
	try {
		const slug = await fetchChannelAndTracks(track_id)
		await playTrack(track_id, '', 'broadcast_sync')
		appState.listening_to_channel_id = channel_id
		log.log('play_success_after_fetch', {track_id, channel_id, slug})
		return true
	} catch (error) {
		log.error('failed_completely', {track_id, error: /** @type {Error} */ (error).message})
		return false
	}
}
