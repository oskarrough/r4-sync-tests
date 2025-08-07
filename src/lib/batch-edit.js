import {extractHashtags, ENTITY_REGEX} from '$lib/utils'

const EDITABLE_FIELDS = ['title', 'description', 'url']

export async function stageEdit(pg, trackId, field, oldValue, newValue) {
	if (!EDITABLE_FIELDS.includes(field)) {
		throw new Error(`field ${field} not editable`)
	}

	await pg.sql`
		INSERT INTO track_edits (track_id, field, old_value, new_value)
		VALUES (${trackId}, ${field}, ${oldValue}, ${newValue})
		ON CONFLICT (track_id, field) DO UPDATE SET
			new_value = EXCLUDED.new_value,
			created_at = CURRENT_TIMESTAMP
	`
}

export async function commitEdits(pg) {
	const edits = await pg.sql`SELECT * FROM track_edits`

	await pg.transaction(async (tx) => {
		for (const edit of edits.rows) {
			if (edit.field === 'title') {
				await tx.sql`UPDATE tracks SET title = ${edit.new_value} WHERE id = ${edit.track_id}`
			} else if (edit.field === 'description') {
				await tx.sql`UPDATE tracks SET description = ${edit.new_value} WHERE id = ${edit.track_id}`
				// Extract tags and mentions from description
				const tags = extractHashtags(edit.new_value)
				const mentions = []
				edit.new_value.replace(ENTITY_REGEX, (match, prefix, entity) => {
					if (entity.startsWith('@')) {
						mentions.push(entity.slice(1).toLowerCase())
					}
				})
				await tx.sql`UPDATE tracks SET tags = ${tags}, mentions = ${mentions} WHERE id = ${edit.track_id}`
			} else if (edit.field === 'url') {
				await tx.sql`UPDATE tracks SET url = ${edit.new_value} WHERE id = ${edit.track_id}`
			}
		}
		await tx.sql`DELETE FROM track_edits`
	})
}

export async function discardEdits(pg) {
	await pg.sql`DELETE FROM track_edits`
}

export async function getEditCount(pg) {
	const {rows} = await pg.sql`SELECT COUNT(*) as count FROM track_edits`
	return rows[0].count
}

export async function getEdits(pg) {
	const {rows} = await pg.sql`SELECT * FROM track_edits ORDER BY created_at DESC`
	return rows
}
