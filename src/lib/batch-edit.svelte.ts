import {sdk} from '@radio4000/sdk'
import {identifier} from '@electric-sql/pglite/template'
import {SvelteMap} from 'svelte/reactivity'
import {pg} from './db'

const EDITABLE_FIELDS = ['title', 'description', 'url']

class BatchEdit {
	async stageFieldEdit(trackId, field, originalValue, newValue) {
		if (newValue === originalValue) {
			// Remove edit if value reverted to original
			await pg.sql`DELETE FROM track_edits WHERE track_id = ${trackId} AND field = ${field} AND status = 'pending'`
			return
		}

		await this.stageEdit(trackId, field, originalValue, newValue)
	}

	async commit() {
		await this.commitEdits()
	}

	async discard() {
		await this.discardEdits()
	}

	async deletePendingEdit(trackId, field) {
		await pg.sql`DELETE FROM track_edits WHERE track_id = ${trackId} AND field = ${field} AND status = 'pending'`
	}

	async undo(trackId, field) {
		await this.undoEdit(trackId, field)
	}

	async stageEdit(trackId, field, oldValue, newValue) {
		if (!EDITABLE_FIELDS.includes(field)) {
			throw new Error(`field ${field} not editable`)
		}

		await pg.sql`
		INSERT INTO track_edits (track_id, field, old_value, new_value, status)
		VALUES (${trackId}, ${field}, ${oldValue}, ${newValue}, 'pending')
		ON CONFLICT (track_id, field) DO UPDATE SET
			new_value = EXCLUDED.new_value,
			status = 'pending',
			created_at = CURRENT_TIMESTAMP
	`
	}

	async commitEdits() {
		const edits = await pg.sql`SELECT * FROM track_edits WHERE status = 'pending'`

		// Group edits by track_id to batch changes per track
		const trackEdits = new SvelteMap()
		for (const edit of edits.rows) {
			if (!trackEdits.has(edit.track_id)) {
				trackEdits.set(edit.track_id, {})
			}
			trackEdits.get(edit.track_id)[edit.field] = edit.new_value
		}

		// Apply changes via SDK
		console.log({trackEdits})
		for (const [trackId, changes] of trackEdits) {
			const {error} = await sdk.tracks.updateTrack(trackId, changes)
			console.log('track edit error', error)
			if (error) throw error

			// Update local DB to match remote
			await pg.transaction(async (tx) => {
				for (const [field, value] of Object.entries(changes)) {
					await tx.sql`UPDATE tracks SET ${identifier`${field}`} = ${value} WHERE id = ${trackId}`
				}
			})
		}

		// Mark edits as applied instead of deleting
		await pg.sql`UPDATE track_edits SET status = 'applied' WHERE status = 'pending'`
	}

	async discardEdits() {
		await pg.sql`DELETE FROM track_edits WHERE status = 'pending'`
	}

	async getEditCount() {
		const {rows} = await pg.sql`SELECT COUNT(*) as count FROM track_edits WHERE status = 'pending'`
		return rows[0].count
	}

	async getEdits() {
		const {rows} =
			await pg.sql`SELECT * FROM track_edits WHERE status = 'pending' ORDER BY created_at DESC`
		return rows
	}

	async getAppliedEdits() {
		const {rows} =
			await pg.sql`SELECT * FROM track_edits WHERE status = 'applied' ORDER BY created_at DESC`
		return rows
	}

	// Get edits for a specific channel
	async getEditsForChannel(channelId) {
		const edits = await this.getEdits()
		const appliedEdits = await this.getAppliedEdits()

		// Get all track IDs from edits
		const trackIds = [...new Set([...edits, ...appliedEdits].map((e) => e.track_id))]
		if (trackIds.length === 0) return {edits: [], appliedEdits: [], tracks: []}

		// Fetch tracks referenced by edits
		const {rows: tracks} = await pg.sql`
			SELECT * FROM tracks 
			WHERE id = ANY(${trackIds}) 
			AND channel_id = ${channelId}
		`

		// Filter edits to only include those for tracks in this channel
		const channelTrackIds = new Set(tracks.map((t) => t.id))
		const channelEdits = edits.filter((e) => channelTrackIds.has(e.track_id))
		const channelAppliedEdits = appliedEdits.filter((e) => channelTrackIds.has(e.track_id))

		return {
			edits: channelEdits,
			appliedEdits: channelAppliedEdits,
			tracks
		}
	}

	async undoEdit(trackId, field) {
		const {rows} =
			await pg.sql`SELECT * FROM track_edits WHERE track_id = ${trackId} AND field = ${field} AND status = 'applied' ORDER BY created_at DESC LIMIT 1`

		if (rows.length === 0) {
			throw new Error('No applied edit found to undo')
		}

		const edit = rows[0]

		// Revert remote change
		const changes = {[field]: edit.old_value}
		const {error} = await sdk.tracks.updateTrack(trackId, changes)
		if (error) throw error

		// Revert local change
		await pg.sql`UPDATE tracks SET ${identifier`${field}`} = ${edit.old_value} WHERE id = ${trackId}`

		// Remove the edit record
		await pg.sql`DELETE FROM track_edits WHERE track_id = ${trackId} AND field = ${field} AND status = 'applied'`
	}
}

export const batchEdit = new BatchEdit()
