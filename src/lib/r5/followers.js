import {logger} from '$lib/logger'
import {r4} from '$lib/r4'
import {getPg, pg} from '$lib/r5/db'

const log = logger.ns('r5:followers').seal()
let syncPromise = null

/**
 * Pull remote follows and save to local
 * @param {string} userChannelId User's channel ID
 * @returns {Promise<void>}
 */
export async function pull(userChannelId) {
	const remoteFollows = await r4.channels.readFollowings(userChannelId)

	await pg.transaction(async (tx) => {
		for (const followedChannel of remoteFollows || []) {
			// Insert follower relationship, mark as synced
			await tx.sql`
				INSERT INTO followers (follower_id, channel_id, created_at, synced_at)
				VALUES (${userChannelId}, ${followedChannel.id}, ${followedChannel.created_at}, CURRENT_TIMESTAMP)
				ON CONFLICT (follower_id, channel_id) DO UPDATE SET
					created_at = ${followedChannel.created_at},
					synced_at = CURRENT_TIMESTAMP
			`

			// Insert/update channel metadata
			await tx.sql`
				INSERT INTO channels (id, name, slug, description, image, created_at, updated_at, latitude, longitude, url)
				VALUES (
					${followedChannel.id}, ${followedChannel.name}, ${followedChannel.slug},
					${followedChannel.description}, ${followedChannel.image},
					${followedChannel.created_at}, ${followedChannel.updated_at},
					${followedChannel.latitude}, ${followedChannel.longitude},
					${followedChannel.url}
				)
				ON CONFLICT (id) DO UPDATE SET
					name = EXCLUDED.name,
					slug = EXCLUDED.slug,
					description = EXCLUDED.description,
					image = EXCLUDED.image,
					updated_at = EXCLUDED.updated_at,
					latitude = EXCLUDED.latitude,
					longitude = EXCLUDED.longitude,
					url = EXCLUDED.url
			`
		}
	})

	log.log('pull_followers', {userChannelId, count: remoteFollows?.length || 0})
}

/**
 * Push local follows to remote
 * @param {string} userChannelId User's channel ID
 * @param {string[]} channelIds Channels to follow
 * @returns {Promise<void>}
 */
export async function push(userChannelId, channelIds) {
	await pg.transaction(async (tx) => {
		for (const channelId of channelIds) {
			// Insert local follower record
			await tx.sql`
				INSERT INTO followers (follower_id, channel_id, created_at, synced_at)
				VALUES (${userChannelId}, ${channelId}, CURRENT_TIMESTAMP, NULL)
				ON CONFLICT (follower_id, channel_id) DO UPDATE SET synced_at = NULL
			`

			// Push to remote
			try {
				await r4.channels.followChannel(userChannelId, channelId)
				await tx.sql`
					UPDATE followers
					SET synced_at = CURRENT_TIMESTAMP
					WHERE follower_id = ${userChannelId} AND channel_id = ${channelId}
				`
			} catch (err) {
				log.error('push_follower_error', {userChannelId, channelId, err})
				// Keep synced_at = NULL on error for retry
			}
		}
	})

	log.log('push_followers', {userChannelId, count: channelIds.length})
}

/**
 * Sync local and remote followers bidirectionally
 * @param {string} userChannelId User's channel ID
 * @returns {Promise<void>}
 */
export async function sync(userChannelId) {
	if (syncPromise) return syncPromise

	syncPromise = doSync(userChannelId).finally(() => (syncPromise = null))
	return syncPromise
}

async function doSync(userChannelId) {
	await getPg()
	log.log('sync_start', userChannelId)

	// 1. Get local favorites before sync with channel metadata
	const {rows: localFavorites} = await pg.sql`
		SELECT f.channel_id, c.source 
		FROM followers f
		JOIN channels c ON f.channel_id = c.id
		WHERE f.follower_id = 'local-user'
	`

	// 2. Pull remote followers (marks remote ones as synced)
	await pull(userChannelId)

	await pg.transaction(async (tx) => {
		// 3. Process each local favorite
		for (const {channel_id, source} of localFavorites) {
			// Check if this channel is already followed by the authenticated user
			const {rows: existing} = await tx.sql`
				SELECT 1 FROM followers 
				WHERE follower_id = ${userChannelId} AND channel_id = ${channel_id}
				LIMIT 1
			`

			if (existing.length === 0) {
				if (source === 'v1') {
					// v1 channel: migrate locally only (can't sync to r4)
					await tx.sql`
						INSERT INTO followers (follower_id, channel_id, created_at, synced_at)
						VALUES (${userChannelId}, ${channel_id}, CURRENT_TIMESTAMP, NULL)
						ON CONFLICT (follower_id, channel_id) DO NOTHING
					`
				} else {
					// r4 channel: add locally and attempt to sync
					await tx.sql`
						INSERT INTO followers (follower_id, channel_id, created_at, synced_at)
						VALUES (${userChannelId}, ${channel_id}, CURRENT_TIMESTAMP, NULL)
						ON CONFLICT (follower_id, channel_id) DO NOTHING
					`

					// Try to push to remote
					try {
						await r4.channels.followChannel(userChannelId, channel_id)
						await tx.sql`
							UPDATE followers
							SET synced_at = CURRENT_TIMESTAMP
							WHERE follower_id = ${userChannelId} AND channel_id = ${channel_id}
						`
					} catch (err) {
						log.error('sync_push_error', {userChannelId, channel_id, err})
					}
				}
			}
		}

		// 4. Clean up local-user followers
		await tx.sql`DELETE FROM followers WHERE follower_id = 'local-user'`

		const v1Count = localFavorites.filter((f) => f.source === 'v1').length
		const r4Count = localFavorites.filter((f) => f.source !== 'v1').length

		log.log('sync_complete', {
			userChannelId,
			localCount: localFavorites.length,
			v1Count,
			r4Count
		})
	})
}
