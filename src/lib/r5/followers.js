import {logger} from '$lib/logger'
import {r4} from '$lib/r4'
import {getPg, pg} from '$lib/r5/db'

const log = logger.ns('r5:followers').seal()

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
	await getPg()
	console.log('r5.followers.sync', userChannelId)

	// 1. Get local favorites before sync
	const {rows: localFavorites} = await pg.sql`
		SELECT channel_id FROM followers WHERE follower_id = 'local-user'
	`

	// 2. Pull remote followers (marks remote ones as synced)
	await pull(userChannelId)

	// 3. Get local favorites that aren't already synced (don't exist remotely)
	const {rows: unsyncedLocal} = await pg.sql`
		SELECT f1.channel_id FROM followers f1
		WHERE f1.follower_id = 'local-user'
		AND NOT EXISTS (
			SELECT 1 FROM followers f2
			WHERE f2.follower_id = ${userChannelId}
			AND f2.synced_at IS NOT NULL
			AND f2.channel_id = f1.channel_id
		)
	`

	// 4. Push only unsynced local favorites
	if (unsyncedLocal.length > 0) {
		const channelIds = unsyncedLocal.map((row) => row.channel_id)
		await push(userChannelId, channelIds)
	}

	// 5. Clean up local-user followers
	await pg.sql`DELETE FROM followers WHERE follower_id = 'local-user'`

	log.log('sync_followers', {
		userChannelId,
		localCount: localFavorites.length,
		pushedCount: unsyncedLocal.length
	})
}
