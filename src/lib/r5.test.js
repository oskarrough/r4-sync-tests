import {describe, it, expect, beforeEach} from 'vitest'
import {r5} from './r5.js'
import {dropDb, migrateDb} from './db.js'

const R4_SLUG = 'ko002'
const V1_SLUG = 'ucfm'

describe('r5 API', () => {
	beforeEach(async () => {
		await dropDb()
		await migrateDb()
	})

	describe('r5.channels', () => {
		it('should list empty local channels initially', async () => {
			const channels = await r5.channels()
			expect(channels).toEqual([])
		})

		it('should return empty array for non-existent slug', async () => {
			const channels = await r5.channels({slug: 'non-existent'})
			expect(channels).toEqual([])
		})

		it('should fetch r4 channel remotely', async () => {
			const channels = await r5.channels.r4({slug: R4_SLUG})
			expect(channels).toBeDefined()
			expect(channels.length).toBeGreaterThan(0)
			if (channels.length > 0) {
				expect(channels[0].slug).toBe(R4_SLUG)
			}
		})

		it('should fetch v1 channel', async () => {
			const channels = await r5.channels.v1({slug: V1_SLUG})
			expect(channels).toBeDefined()
			expect(channels.length).toBeGreaterThan(0)
			if (channels.length > 0) {
				expect(channels[0].slug).toBe(V1_SLUG)
				expect(channels[0].firebase_id).toBeDefined()
				expect(channels[0].source).toBe('v1')
			}
		})

		it('should pull r4 channel and store locally', async () => {
			// Pull from remote
			const pulled = await r5.channels.pull({slug: R4_SLUG})
			expect(pulled).toBeDefined()
			expect(pulled.length).toBeGreaterThan(0)
			expect(pulled[0].slug).toBe(R4_SLUG)

			// Verify it's stored locally
			const local = await r5.channels({slug: R4_SLUG})
			expect(local.length).toBe(1)
			expect(local[0].slug).toBe(R4_SLUG)
		})

		it('should pull v1 channel and store locally', async () => {
			// Pull from v1
			const pulled = await r5.channels.pull({slug: V1_SLUG})
			expect(pulled).toBeDefined()
			expect(pulled.length).toBeGreaterThan(0)
			expect(pulled[0].slug).toBe(V1_SLUG)

			// Verify it's stored locally
			const local = await r5.channels({slug: V1_SLUG})
			expect(local.length).toBe(1)
			expect(local[0].slug).toBe(V1_SLUG)
			expect(local[0].firebase_id).toBeDefined()
		})

		it('should handle pull for non-existent channel', async () => {
			await expect(r5.channels.pull({slug: 'non-existent-999'})).rejects.toThrow(
				'channel_not_found'
			)
		})

		it('should check if channel is outdated', async () => {
			// First pull a channel
			await r5.channels.pull({slug: R4_SLUG})

			// Check if it's outdated (should be false for just-pulled channel)
			const isOutdated = await r5.channels.outdated(R4_SLUG)
			expect(typeof isOutdated).toBe('boolean')
		})

		it('should list multiple channels', async () => {
			// Pull some channels without slug to get multiple
			const channels = await r5.channels.pull({limit: 5})
			expect(channels).toBeDefined()
			expect(Array.isArray(channels)).toBe(true)

			// Verify they're stored locally
			const local = await r5.channels({limit: 5})
			expect(local.length).toBeGreaterThan(0)
		})
	})

	describe('r5.tracks', () => {
		beforeEach(async () => {
			// Ensure we have channels first
			await r5.channels.pull({slug: R4_SLUG})
			await r5.channels.pull({slug: V1_SLUG})
		})

		it('should list empty local tracks initially', async () => {
			const tracks = await r5.tracks()
			expect(tracks).toEqual([])
		})

		it('should return empty array for channel without tracks', async () => {
			const tracks = await r5.tracks({slug: R4_SLUG})
			expect(tracks).toEqual([])
		})

		it('should fetch r4 tracks remotely', async () => {
			const tracks = await r5.tracks.r4({slug: R4_SLUG})
			expect(tracks).toBeDefined()
			expect(Array.isArray(tracks)).toBe(true)
			if (tracks.length > 0) {
				expect(tracks[0]).toHaveProperty('url')
				expect(tracks[0]).toHaveProperty('title')
			}
		})

		it('should pull r4 tracks and store locally', async () => {
			// Pull tracks
			const pulled = await r5.tracks.pull({slug: R4_SLUG})
			expect(pulled).toBeDefined()
			expect(Array.isArray(pulled)).toBe(true)
			expect(pulled.length).toBeGreaterThan(0)

			// Verify they're stored locally
			const local = await r5.tracks({slug: R4_SLUG})
			expect(local.length).toBe(pulled.length)
			expect(local[0].channel_slug).toBe(R4_SLUG)
		})

		it('should pull v1 tracks and store locally', async () => {
			// Pull v1 tracks
			const pulled = await r5.tracks.pull({slug: V1_SLUG})
			expect(pulled).toBeDefined()
			expect(Array.isArray(pulled)).toBe(true)

			// Verify they're stored locally
			const local = await r5.tracks({slug: V1_SLUG})
			expect(local.length).toBeGreaterThan(0)
			expect(local[0].channel_slug).toBe(V1_SLUG)
		})

		it('should handle pull for non-existent channel', async () => {
			await expect(r5.tracks.pull({slug: 'non-existent-999'})).rejects.toThrow('channel_not_found')
		})

		it('should list all tracks when no slug provided', async () => {
			// Pull tracks for both channels
			await r5.tracks.pull({slug: R4_SLUG})
			await r5.tracks.pull({slug: V1_SLUG})

			// Get all tracks
			const allTracks = await r5.tracks()
			expect(allTracks.length).toBeGreaterThan(0)
		})
	})

	describe('r5.pull', () => {
		it('should pull both channel and tracks', async () => {
			const result = await r5.pull(R4_SLUG)

			expect(result).toHaveProperty('channels')
			expect(result).toHaveProperty('tracks')
			expect(result.channels.length).toBe(1)
			expect(result.channels[0].slug).toBe(R4_SLUG)
			expect(result.tracks.length).toBeGreaterThan(0)
		})
	})

	describe('edge cases and bugs', () => {
		it('should handle remoteChannels returning single object vs array', async () => {
			// The bug: line 48 returns single channel object, but line 91 expects array
			const channel = await r5.channels.r4({slug: R4_SLUG})
			expect(Array.isArray(channel)).toBe(true)
		})

		it('should handle missing source field correctly', async () => {
			// Pull r4 channel (doesn't have source field)
			await r5.channels.pull({slug: R4_SLUG})

			// This should not fail even without source field
			const tracks = await r5.tracks.pull({slug: R4_SLUG})
			expect(tracks).toBeDefined()
		})

		it('should handle concurrent pulls gracefully', async () => {
			// Test concurrent operations don't cause issues
			const promises = [r5.channels.pull({slug: R4_SLUG}), r5.channels.pull({slug: V1_SLUG})]

			const results = await Promise.all(promises)
			expect(results).toHaveLength(2)
			expect(results[0][0].slug).toBe(R4_SLUG)
			expect(results[1][0].slug).toBe(V1_SLUG)
		})

		it('should handle v1 channels without firebase_id', async () => {
			// Some v1 channels might not have firebase_id
			const channels = await r5.channels.v1({limit: 10})
			expect(channels).toBeDefined()
			// Should not crash even if some don't have firebase_id
		})
	})
})
