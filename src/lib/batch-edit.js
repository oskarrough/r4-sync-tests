import {sdk} from '@radio4000/sdk'

const EDITABLE_FIELDS = ['title', 'description', 'url']

export async function stageEdit(pg, trackId, field, oldValue, newValue) {
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

export async function commitEdits(pg) {
	const edits = await pg.sql`SELECT * FROM track_edits WHERE status = 'pending'`

	// Group edits by track_id to batch changes per track
	const trackEdits = new Map()
	for (const edit of edits.rows) {
		if (!trackEdits.has(edit.track_id)) {
			trackEdits.set(edit.track_id, {})
		}
		trackEdits.get(edit.track_id)[edit.field] = edit.new_value
	}

	// Apply changes via SDK
	for (const [trackId, changes] of trackEdits) {
		const {error} = await sdk.tracks.updateTrack(trackId, changes)
		if (error) throw error

		// Update local DB to match remote
		await pg.transaction(async (tx) => {
			for (const [field, value] of Object.entries(changes)) {
				if (field === 'title') {
					await tx.sql`UPDATE tracks SET title = ${value} WHERE id = ${trackId}`
				} else if (field === 'description') {
					await tx.sql`UPDATE tracks SET description = ${value} WHERE id = ${trackId}`
				} else if (field === 'url') {
					await tx.sql`UPDATE tracks SET url = ${value} WHERE id = ${trackId}`
				}
			}
		})
	}

	// Mark edits as applied instead of deleting
	await pg.sql`UPDATE track_edits SET status = 'applied' WHERE status = 'pending'`
}

export async function discardEdits(pg) {
	await pg.sql`DELETE FROM track_edits WHERE status = 'pending'`
}

export async function getEditCount(pg) {
	const {rows} = await pg.sql`SELECT COUNT(*) as count FROM track_edits WHERE status = 'pending'`
	return rows[0].count
}

export async function getEdits(pg) {
	const {rows} =
		await pg.sql`SELECT * FROM track_edits WHERE status = 'pending' ORDER BY created_at DESC`
	return rows
}

export async function getAppliedEdits(pg) {
	const {rows} =
		await pg.sql`SELECT * FROM track_edits WHERE status = 'applied' ORDER BY created_at DESC`
	return rows
}

export async function undoEdit(pg, trackId, field) {
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
	await pg.transaction(async (tx) => {
		if (field === 'title') {
			await tx.sql`UPDATE tracks SET title = ${edit.old_value} WHERE id = ${trackId}`
		} else if (field === 'description') {
			await tx.sql`UPDATE tracks SET description = ${edit.old_value} WHERE id = ${trackId}`
		} else if (field === 'url') {
			await tx.sql`UPDATE tracks SET url = ${edit.old_value} WHERE id = ${trackId}`
		}
	})

	// Remove the edit record
	await pg.sql`DELETE FROM track_edits WHERE track_id = ${trackId} AND field = ${field} AND status = 'applied'`
}
