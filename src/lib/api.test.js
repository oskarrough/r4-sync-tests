import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import migrationsql from '$lib/migrations/01-create_tables.sql?raw'
import migration13sql from '$lib/migrations/13-create_track_edits.sql?raw'
import migration14sql from '$lib/migrations/14-add_tags_mentions.sql?raw'
import {PGlite} from '@electric-sql/pglite'
import {stageEdit, commitEdits, discardEdits, getEditCount, getEdits} from './batch-edit.js'

/** @type {import('@electric-sql/pglite').PGlite} */
let testPg
/** @type {string} */
let testChannelId

beforeEach(async () => {
	// Create in-memory PGlite instance for testing
	testPg = await PGlite.create({
		dataDir: 'memory://'
	})

	// Apply minimal subset of migrations needed for these tests
	await testPg.exec(migrationsql)
	await testPg.exec(migration14sql)
	await testPg.exec(migration13sql)

	// Seed a channel to satisfy FK on tracks
	const channelResult = await testPg.sql`
		INSERT INTO channels (name, slug) VALUES ('Test Channel', 'test-channel') RETURNING id
	`
	testChannelId = channelResult.rows[0].id
})

afterEach(async () => {
	if (testPg) {
		await testPg.close()
	}
})

describe('batch editing api', () => {
	it('should stage edits correctly', async () => {
		// Insert test track
		const trackResult = await testPg.sql`
			INSERT INTO tracks (channel_id, url, title, tags, description) 
			VALUES (${testChannelId}, 'https://example.com', 'test track', ARRAY['electronic'], 'test description')
			RETURNING id
		`
		const trackId = trackResult.rows[0].id

		// Stage an edit
		await stageEdit(testPg, trackId, 'title', 'test track', 'updated track')

		// Check edit was staged
		const edits = await testPg.sql`SELECT * FROM track_edits`
		expect(edits.rows).toHaveLength(1)
		expect(edits.rows[0].track_id).toBe(trackId)
		expect(edits.rows[0].field).toBe('title')
		expect(edits.rows[0].old_value).toBe('test track')
		expect(edits.rows[0].new_value).toBe('updated track')
	})

	it('should update existing edit on conflict', async () => {
		// Insert test track
		const trackResult = await testPg.sql`
			INSERT INTO tracks (channel_id, url, title, tags, description) 
			VALUES (${testChannelId}, 'https://example.com', 'test track', ARRAY['electronic'], 'test description')
			RETURNING id
		`
		const trackId = trackResult.rows[0].id

		// Stage first edit
		await stageEdit(testPg, trackId, 'title', 'test track', 'first update')

		// Stage second edit for same field
		await stageEdit(testPg, trackId, 'title', 'test track', 'second update')

		// Should only have one edit with latest value
		const edits = await testPg.sql`SELECT * FROM track_edits`
		expect(edits.rows).toHaveLength(1)
		expect(edits.rows[0].new_value).toBe('second update')
	})

	it('should reject invalid fields', async () => {
		const trackResult = await testPg.sql`
			INSERT INTO tracks (channel_id, url, title, tags, description) 
			VALUES (${testChannelId}, 'https://example.com/x', 'test track', ARRAY['electronic'], 'test description')
			RETURNING id
		`
		const trackId = trackResult.rows[0].id

		await expect(stageEdit(testPg, trackId, 'invalid_field', 'old', 'new')).rejects.toThrow(
			'field invalid_field not editable'
		)
	})

	it('should commit edits correctly', async () => {
		// Insert test track
		const trackResult = await testPg.sql`
			INSERT INTO tracks (channel_id, url, title, tags, description) 
			VALUES (${testChannelId}, 'https://example.com', 'old title', ARRAY['old', 'tags'], 'old description')
			RETURNING id
		`
		const trackId = trackResult.rows[0].id

		// Stage multiple edits
		await stageEdit(testPg, trackId, 'title', 'old title', 'new title')
		await stageEdit(testPg, trackId, 'description', 'old description', 'new #hashtag description')

		// Commit edits
		await commitEdits(testPg)

		// Check track was updated
		const track = await testPg.sql`SELECT * FROM tracks WHERE id = ${trackId}`
		expect(track.rows[0].title).toBe('new title')
		expect(track.rows[0].tags).toEqual(['#hashtag'])
		expect(track.rows[0].description).toBe('new #hashtag description')

		// Check edits were cleared
		const edits = await testPg.sql`SELECT * FROM track_edits`
		expect(edits.rows).toHaveLength(0)
	})

	it('should discard edits correctly', async () => {
		// Insert test track
		const trackResult = await testPg.sql`
			INSERT INTO tracks (channel_id, url, title, tags, description) 
			VALUES (${testChannelId}, 'https://example.com', 'original title', ARRAY['original', 'tags'], 'original description')
			RETURNING id
		`
		const trackId = trackResult.rows[0].id

		// Stage edits
		await stageEdit(testPg, trackId, 'title', 'original title', 'staged title')
		await stageEdit(testPg, trackId, 'description', 'original description', 'staged description')

		// Discard edits
		await discardEdits(testPg)

		// Check track unchanged
		const track = await testPg.sql`SELECT * FROM tracks WHERE id = ${trackId}`
		expect(track.rows[0].title).toBe('original title')
		expect(track.rows[0].tags).toEqual(['original', 'tags'])

		// Check edits were cleared
		const edits = await testPg.sql`SELECT * FROM track_edits`
		expect(edits.rows).toHaveLength(0)
	})

	it('should get edit count correctly', async () => {
		// Insert test tracks
		const track1Result = await testPg.sql`
			INSERT INTO tracks (channel_id, url, title) VALUES (${testChannelId}, 'https://example.com/1', 'track 1') RETURNING id
		`
		const track2Result = await testPg.sql`
			INSERT INTO tracks (channel_id, url, title) VALUES (${testChannelId}, 'https://example.com/2', 'track 2') RETURNING id
		`

		const track1Id = track1Result.rows[0].id
		const track2Id = track2Result.rows[0].id

		// Initially no edits
		expect(await getEditCount(testPg)).toBe(0)

		// Stage some edits
		await stageEdit(testPg, track1Id, 'title', 'track 1', 'updated track 1')
		expect(await getEditCount(testPg)).toBe(1)

		await stageEdit(testPg, track2Id, 'title', 'track 2', 'updated track 2')
		await stageEdit(testPg, track2Id, 'description', '', 'new description')
		expect(await getEditCount(testPg)).toBe(3)
	})

	it('should get edits with correct ordering', async () => {
		// Insert test track
		const trackResult = await testPg.sql`
			INSERT INTO tracks (channel_id, url, title, tags) VALUES (${testChannelId}, 'https://example.com/3', 'test', ARRAY['tag1']) RETURNING id
		`
		const trackId = trackResult.rows[0].id

		// Stage edits with small delay to ensure different timestamps
		await stageEdit(testPg, trackId, 'title', 'test', 'first edit')
		await new Promise((resolve) => setTimeout(resolve, 10))
		await stageEdit(testPg, trackId, 'description', '', 'second edit')

		const edits = await getEdits(testPg)
		expect(edits).toHaveLength(2)
		// Should be ordered by created_at DESC (newest first)
		expect(edits[0].field).toBe('description')
		expect(edits[1].field).toBe('title')
	})

	it('should handle multiple field edits on same track', async () => {
		// Insert test track
		const trackResult = await testPg.sql`
			INSERT INTO tracks (channel_id, url, title, tags, description) 
			VALUES (${testChannelId}, 'https://example.com/4', 'original title', ARRAY['original', 'tags'], 'original desc') 
			RETURNING id
		`
		const trackId = trackResult.rows[0].id

		// Stage edits for different fields
		await stageEdit(testPg, trackId, 'title', 'original title', 'new title')
		await stageEdit(testPg, trackId, 'description', 'original desc', 'new #newtag desc')
		await stageEdit(testPg, trackId, 'url', '', 'https://example.com')

		// Should have 3 edits
		expect(await getEditCount(testPg)).toBe(3)

		// Commit and verify all fields updated
		await commitEdits(testPg)

		const track = await testPg.sql`SELECT * FROM tracks WHERE id = ${trackId}`
		expect(track.rows[0].title).toBe('new title')
		expect(track.rows[0].tags).toEqual(['#newtag'])
		expect(track.rows[0].description).toBe('new #newtag desc')
		expect(track.rows[0].url).toBe('https://example.com')
	})
})
