import {r4} from '$lib/r4'
import {pg} from '$lib/db'
import {logger} from '$lib/logger'
import {playTrack} from '$lib/api'
import {pullChannel} from '$lib/sync'
import {r5} from '$lib/experimental-api'
import {appState} from '$lib/app-state.svelte'

const log = logger.ns('broadcast').seal()

/** @type {string|null} */
let lastBroadcastingChannelId = null
/** @type {string|null} */
let lastTrackId = null
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
		log.log('broadcast:join', {channelId})
	} catch (error) {
		log.error('broadcast:join_error', {
			channelId,
			error: /** @type {Error} */ (error).message
		})
	}
}

export function leaveBroadcast() {
	stopBroadcastSync()
	appState.listening_to_channel_id = undefined
	log.log('broadcast:leave')
}

/* Handle broadcast state and track changes */
export async function handleBroadcastStateChange(broadcasting_channel_id, playlist_track) {
	if (broadcasting_channel_id !== lastBroadcastingChannelId) {
		if (broadcasting_channel_id) {
			await createRemoteBroadcast(broadcasting_channel_id, playlist_track)
		} else {
			await deleteRemoteBroadcast(lastBroadcastingChannelId)
		}
		lastBroadcastingChannelId = broadcasting_channel_id
	}
}

export async function handleTrackChange(broadcasting_channel_id, playlist_track) {
	if (broadcasting_channel_id && playlist_track !== lastTrackId) {
		await updateRemoteBroadcastTrack(broadcasting_channel_id, playlist_track)
		lastTrackId = playlist_track
	}
}

/**
 * @param {string|null} channelId
 * @param {string|null} trackId
 */
async function createRemoteBroadcast(channelId, trackId) {
	log.log('create_attempt', {channelId, trackId, trackIdType: typeof trackId})

	if (!trackId) {
		log.log('create_skipped_no_track', {channelId})
		return
	}

	// Check if track is from v1 channel - these can't be broadcast
	const {rows} = await pg.sql`
		SELECT c.firebase_id 
		FROM channels c 
		JOIN tracks t ON c.id = t.channel_id 
		WHERE t.id = ${trackId}
	`
	if (rows[0]?.firebase_id) {
		log.log('create_skipped_v1_track', {channelId, trackId, firebase_id: rows[0].firebase_id})
		return
	}

	// Try to create broadcast directly first, sync if foreign key fails
	try {
		await r4.sdk.supabase
			.from('broadcast')
			.upsert({
				channel_id: channelId,
				track_id: trackId,
				track_played_at: new Date().toISOString()
			})
			.throwOnError()
		log.log('create', {channelId, trackId})
		return
	} catch (error) {
		const errorMsg = /** @type {Error} */ (error).message

		// If foreign key constraint violation, try to sync the track
		if (
			errorMsg.includes('violates foreign key constraint') &&
			errorMsg.includes('track_id_fkey')
		) {
			log.log('fk_violation_syncing_track', {channelId, trackId})

			// Get channel slug for this track
			const {rows} = await pg.sql`
				SELECT c.slug 
				FROM channels c 
				JOIN tracks t ON c.id = t.channel_id 
				WHERE t.id = ${trackId}
			`
			const channel = rows[0]

			if (channel?.slug) {
				try {
					await pullChannel(channel.slug)
					await r5.tracks.pull({slug: channel.slug})
					log.log('track_synced_retrying_broadcast', {channelId, trackId, slug: channel.slug})

					// Retry broadcast creation
					await r4.sdk.supabase
						.from('broadcast')
						.upsert({
							channel_id: channelId,
							track_id: trackId,
							track_played_at: new Date().toISOString()
						})
						.throwOnError()
					log.log('create_after_sync', {channelId, trackId})
					return
				} catch (syncError) {
					log.error('sync_failed', {
						channelId,
						trackId,
						slug: channel.slug,
						error: /** @type {Error} */ (syncError).message
					})
				}
			} else {
				log.error('track_channel_not_found_locally', {channelId, trackId})
			}
		}

		log.error('create_error', {
			channelId,
			trackId,
			error: errorMsg
		})
	}
}

/**
 * @param {string|null} channelId
 */
async function deleteRemoteBroadcast(channelId) {
	if (!channelId) return
	try {
		await r4.sdk.supabase.from('broadcast').delete().eq('channel_id', channelId).throwOnError()
		log.log('delete', {channelId})
	} catch (error) {
		log.error('delete_error', {
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

/** @param {string} channelId */
function startBroadcastSync(channelId) {
	stopBroadcastSync()

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
				log.log('broadcast:change', {channelId, track_id: broadcast.track_id})
				syncPlayBroadcast(broadcast)
			}
		)
		.subscribe()
}

export function stopBroadcastSync() {
	if (broadcastSyncChannel) {
		broadcastSyncChannel.unsubscribe()
		broadcastSyncChannel = null
	}
}

/** @param {import('$lib/types').Broadcast} broadcast */
export async function syncPlayBroadcast(broadcast) {
	const {track_id, track_played_at} = broadcast
	const playbackPosition = (Date.now() - new Date(track_played_at).getTime()) / 1000

	if (playbackPosition > 600) {
		log.log('sync_play_broadcast_ignored_stale', {playbackPosition, track_id})
		return
	}

	try {
		await playTrack(track_id, '', 'broadcast_sync')
	} catch {
		const {data} = await r4.sdk.supabase
			.from('channel_track')
			.select('channels(slug)')
			.eq('track_id', track_id)
			.single()
			.throwOnError()
		// @ts-expect-error supabase
		const slug = data?.channels?.slug
		if (slug) {
			await pullChannel(slug)
			await r5.tracks.pull({slug})
			await playTrack(track_id, '', 'broadcast_sync')
			appState.listening_to_channel_id = broadcast.channel_id
			log.log('sync_play_broadcast', track_id)
			return true
		}
	}
}
