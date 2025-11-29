import {getPg} from './db.js'

/**
 * Get aggregated hashtag statistics for a channel from local database
 * @param {object} options - Options object
 * @param {string} options.slug - Channel slug
 * @param {number} [options.limit] - Optional limit for number of tags returned
 * @param {Date} [options.startDate] - Optional start date for filtering tracks
 * @param {Date} [options.endDate] - Optional end date for filtering tracks
 * @returns {Promise<Array<{tag: string, count: number}>>} Array of tags with their usage counts
 */
export async function local({slug, limit, startDate, endDate}) {
	const pg = await getPg()

	if (startDate && endDate) {
		return limit
			? (
					await pg.sql`
				SELECT
					unnest(tags) as tag,
					COUNT(*)::int as count
				FROM tracks_with_meta
				WHERE slug = ${slug}
					AND tags IS NOT NULL
					AND created_at >= ${startDate}
					AND created_at < ${endDate}
				GROUP BY tag
				ORDER BY count DESC, tag ASC
				LIMIT ${limit}
			`
				).rows
			: (
					await pg.sql`
				SELECT
					unnest(tags) as tag,
					COUNT(*)::int as count
				FROM tracks_with_meta
				WHERE slug = ${slug}
					AND tags IS NOT NULL
					AND created_at >= ${startDate}
					AND created_at < ${endDate}
				GROUP BY tag
				ORDER BY count DESC, tag ASC
			`
				).rows
	}

	return limit
		? (
				await pg.sql`
			SELECT
				unnest(tags) as tag,
				COUNT(*)::int as count
			FROM tracks_with_meta
			WHERE slug = ${slug}
				AND tags IS NOT NULL
			GROUP BY tag
			ORDER BY count DESC, tag ASC
			LIMIT ${limit}
		`
			).rows
		: (
				await pg.sql`
			SELECT
				unnest(tags) as tag,
				COUNT(*)::int as count
			FROM tracks_with_meta
			WHERE slug = ${slug}
				AND tags IS NOT NULL
			GROUP BY tag
			ORDER BY count DESC, tag ASC
		`
			).rows
}

/**
 * Get the date range (first and last track) for a channel
 * @param {string} slug - Channel slug
 * @returns {Promise<{minDate: Date, maxDate: Date}>} Date range for tracks in channel
 */
export async function getChannelDateRange(slug) {
	const pg = await getPg()
	const {rows} = await pg.sql`
		SELECT
			MIN(created_at) as min_date,
			MAX(created_at) as max_date
		FROM tracks_with_meta
		WHERE slug = ${slug}
	`
	const result = rows[0]
	return {
		minDate: result?.min_date ? new Date(result.min_date) : new Date(),
		maxDate: result?.max_date ? new Date(result.max_date) : new Date()
	}
}
