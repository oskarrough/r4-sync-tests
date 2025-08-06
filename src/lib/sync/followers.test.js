import {describe, it, expect, beforeEach} from 'vitest'
import {PGlite} from '@electric-sql/pglite'

const testPg = new PGlite()
let followChannelCalls = []

const mockSdk = {
	channels: {
		readFollowings: () => Promise.resolve({data: [], error: null}),
		followChannel: (userChannelId, channelId) => {
			followChannelCalls.push({userChannelId, channelId})
			return Promise.resolve({error: null})
		}
	}
}

// Test implementation of sync logic
async function testSyncFollowers(userChannelId) {
	// 1. Pull remote followers
	const {data: remoteFollows} = await mockSdk.channels.readFollowings(userChannelId)
	await testPg.transaction(async (tx) => {
		for (const followedChannel of remoteFollows || []) {
			await tx.sql`
				INSERT INTO followers (follower_id, channel_id, created_at, synced_at)
				VALUES (${userChannelId}, ${followedChannel.id}, ${followedChannel.created_at}, CURRENT_TIMESTAMP)
				ON CONFLICT (follower_id, channel_id) DO UPDATE SET
					created_at = ${followedChannel.created_at},
					synced_at = CURRENT_TIMESTAMP
			`
		}
	})

	// 3. Get local favorites that aren't already synced
	const {rows: unsyncedLocal} = await testPg.sql`
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
		await testPg.transaction(async (tx) => {
			for (const {channel_id} of unsyncedLocal) {
				await tx.sql`
					INSERT INTO followers (follower_id, channel_id, created_at, synced_at)
					VALUES (${userChannelId}, ${channel_id}, CURRENT_TIMESTAMP, NULL)
					ON CONFLICT (follower_id, channel_id) DO UPDATE SET synced_at = NULL
				`
				await mockSdk.channels.followChannel(userChannelId, channel_id)
				await tx.sql`
					UPDATE followers 
					SET synced_at = CURRENT_TIMESTAMP 
					WHERE follower_id = ${userChannelId} AND channel_id = ${channel_id}
				`
			}
		})
	}

	// 5. Clean up local-user followers
	await testPg.sql`DELETE FROM followers WHERE follower_id = 'local-user'`
}

describe('followers sync', () => {
	beforeEach(async () => {
		// Reset state
		followChannelCalls = []

		// Reset mock function
		mockSdk.channels.readFollowings = () => Promise.resolve({data: [], error: null})

		// Setup test schema
		await testPg.exec(`
			DROP TABLE IF EXISTS followers;
			
			CREATE TABLE followers (
				follower_id text,
				channel_id text,
				created_at timestamp DEFAULT CURRENT_TIMESTAMP,
				synced_at timestamp,
				PRIMARY KEY (follower_id, channel_id)
			);
		`)
	})

	it('syncs local favorites without duplicates', async () => {
		const userChannelId = 'user-123'

		// Setup: local favorites A, B
		await testPg.exec(`
			INSERT INTO followers (follower_id, channel_id) 
			VALUES 
				('local-user', 'channel-A'),
				('local-user', 'channel-B')
		`)

		// Mock: remote already has B, C
		mockSdk.channels.readFollowings = () =>
			Promise.resolve({
				data: [
					{id: 'channel-B', created_at: '2024-01-01T00:00:00Z'},
					{id: 'channel-C', created_at: '2024-01-01T00:00:00Z'}
				],
				error: null
			})

		await testSyncFollowers(userChannelId)

		// Should push only channel-A (not B since it exists remotely)
		expect(followChannelCalls).toHaveLength(1)
		expect(followChannelCalls[0]).toEqual({userChannelId, channelId: 'channel-A'})

		// Should have all channels locally
		const result = await testPg.query(
			'SELECT channel_id FROM followers WHERE follower_id = $1 ORDER BY channel_id',
			[userChannelId]
		)
		const channelIds = result.rows.map((r) => r.channel_id)
		expect(channelIds).toEqual(['channel-A', 'channel-B', 'channel-C'])

		// Should clean up local-user entries
		const localUser = await testPg.query('SELECT * FROM followers WHERE follower_id = $1', [
			'local-user'
		])
		expect(localUser.rows).toHaveLength(0)
	})

	it('handles empty local and remote followers', async () => {
		const userChannelId = 'user-123'

		await testSyncFollowers(userChannelId)

		expect(followChannelCalls).toHaveLength(0)

		const result = await testPg.query('SELECT * FROM followers')
		expect(result.rows).toHaveLength(0)
	})

	it('pushes all local when no remote exist', async () => {
		const userChannelId = 'user-123'

		await testPg.exec(`
			INSERT INTO followers (follower_id, channel_id) 
			VALUES 
				('local-user', 'channel-A'),
				('local-user', 'channel-B')
		`)

		await testSyncFollowers(userChannelId)

		expect(followChannelCalls).toHaveLength(2)
		expect(followChannelCalls.map((c) => c.channelId).sort()).toEqual(['channel-A', 'channel-B'])
	})
})
