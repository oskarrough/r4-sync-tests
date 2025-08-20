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

/** Start broadcasting for the current user */
export async function startBroadcast(channelId, trackId) {
	log.log('start_broadcast_requested', {channelId, trackId})
	await createRemoteBroadcast(channelId, trackId)
}

/** Stop broadcasting for the current user */
export async function stopBroadcast(channelId) {
	log.log('stop_broadcast_requested', {channelId})
	await deleteRemoteBroadcast(channelId)
}

/** Update the track while broadcasting */
export async function updateBroadcast(channelId, trackId) {
	log.log('update_broadcast_requested', {channelId, trackId})
	await updateRemoteBroadcastTrack(channelId, trackId)
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
		SELECT c.source 
		FROM channels c 
		JOIN tracks t ON c.id = t.channel_id 
		WHERE t.id = ${trackId}
	`
	if (rows[0]?.source === 'v1') {
		const error = new Error('Cannot broadcast tracks from v1 channels')
		log.error('❌ broadcast_start_failed_v1_track', {channelId, trackId, source: rows[0].source})
		throw error
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
		log.log('✅ remote_broadcast_created_successfully', {channelId, trackId})
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
					await r5.channels.pull({slug: channel.slug})
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
					log.log('✅ remote_broadcast_created_after_sync', {channelId, trackId})
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

		log.error('❌ remote_broadcast_create_failed', {
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
		log.log('✅ remote_broadcast_deleted_successfully', {channelId})
	} catch (error) {
		log.error('❌ remote_broadcast_delete_failed', {
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

	log.log('sync:starting', {channelId})

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
				log.log('sync:change_received', {
					channelId,
					track_id: broadcast.track_id,
					track_played_at: broadcast.track_played_at,
					payload_event: payload.eventType
				})
				syncPlayBroadcast(broadcast)
			}
		)
		.subscribe((status) => {
			log.log('sync:subscription_status', {channelId, status})
		})
}

export function stopBroadcastSync() {
	if (broadcastSyncChannel) {
		log.log('sync:stopping')
		broadcastSyncChannel.unsubscribe()
		broadcastSyncChannel = null
	}
}

/** @param {import('$lib/types').Broadcast} broadcast */
export async function syncPlayBroadcast(broadcast) {
	const {track_id, track_played_at, channel_id} = broadcast
	const playbackPosition = (Date.now() - new Date(track_played_at).getTime()) / 1000

	log.log('sync:play_attempt', {
		track_id,
		channel_id,
		track_played_at,
		playbackPosition: Math.round(playbackPosition)
	})

	if (playbackPosition > 600) {
		log.log('sync:play_ignored_stale', {playbackPosition: Math.round(playbackPosition), track_id})
		return
	}

	try {
		await playTrack(track_id, '', 'broadcast_sync')
		appState.listening_to_channel_id = channel_id
		log.log('sync:play_success', {track_id, channel_id})
		return true
	} catch (error) {
		log.log('sync:play_failed_fetching_channel', {
			track_id,
			error: /** @type {Error} */ (error).message
		})

		const {data} = await r4.sdk.supabase
			.from('channel_track')
			.select('channels(slug)')
			.eq('track_id', track_id)
			.single()
			.throwOnError()
		// @ts-expect-error supabase
		const slug = data?.channels?.slug
		if (slug) {
			try {
				await r5.channels.pull({slug})
				await r5.tracks.pull({slug})
				await playTrack(track_id, '', 'broadcast_sync')
				appState.listening_to_channel_id = channel_id
				log.log('sync:play_success_after_fetch', {track_id, channel_id, slug})
				return true
			} catch (syncError) {
				log.error('sync:play_failed_after_fetch', {
					track_id,
					channel_id,
					slug,
					error: /** @type {Error} */ (syncError).message
				})
			}
		} else {
			log.error('sync:play_no_channel_found', {track_id})
		}
	}
}
