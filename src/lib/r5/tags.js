import {getPg} from './db.js'

/**
 * Get aggregated hashtag statistics for a channel from local database
 * @param {string} slug - Channel slug
 * @param {number} [limit] - Optional limit for number of tags returned
 * @returns {Promise<Array<{tag: string, count: number}>>} Array of tags with their usage counts
 */
export async function local(slug, limit) {
	const pg = await getPg()
	if (limit) {
		return (
			await pg.sql`
			SELECT 
				unnest(tags) as tag,
				COUNT(*)::int as count
			FROM tracks_with_meta
			WHERE channel_slug = ${slug}
				AND tags IS NOT NULL
			GROUP BY tag
			ORDER BY count DESC, tag ASC
			LIMIT ${limit}
		`
		).rows
	}
	return (
		await pg.sql`
		SELECT 
			unnest(tags) as tag,
			COUNT(*)::int as count
		FROM tracks_with_meta
		WHERE channel_slug = ${slug}
			AND tags IS NOT NULL
		GROUP BY tag
		ORDER BY count DESC, tag ASC
	`
	).rows
}
