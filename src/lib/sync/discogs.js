import {getPg} from '../r5/db.js'

/**
 * Pull discogs data for a track by discogs URL
 * @param {string} ytid
 * @param {string} discogsUrl
 */
export async function pullDiscogs(ytid, discogsUrl) {
	if (!ytid || !discogsUrl) return null

	const discogsData = await fetchDiscogs(discogsUrl)
	if (!discogsData) return null

	try {
		const pg = await getPg()
		await pg.sql`
			INSERT INTO track_meta (ytid, discogs_data, discogs_updated_at, updated_at)
			VALUES (${ytid}, ${JSON.stringify(discogsData)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT (ytid) DO UPDATE SET
				discogs_data = EXCLUDED.discogs_data,
				discogs_updated_at = EXCLUDED.discogs_updated_at,
				updated_at = EXCLUDED.updated_at
		`
		console.log('pull_discogs:updated', discogsData)
		return discogsData
	} catch (error) {
		console.error('pull_discogs:error', {ytid, discogsUrl, error})
		return null
	}
}

/**
 * Parse a Discogs URL to extract resource type and ID
 * @param {string} url
 * @returns {{type: string, id: string} | null}
 */
export function parseDiscogsUrl(url) {
	if (!url) return null

	// Handle different Discogs URL formats
	const patterns = [
		/discogs\.com\/([^/]+)\/([^/]+)\/(\d+)/, // new format: /master/release/123
		/discogs\.com\/([^/]+)\/(\d+)/ // old format: /release/123
	]

	for (const pattern of patterns) {
		const match = url.match(pattern)
		if (match) {
			if (match[3]) {
				// Three-part match: type, subtype, id
				return {type: match[2], id: match[3]}
			} else {
				// Two-part match: type, id
				return {type: match[1], id: match[2]}
			}
		}
	}

	return null
}

/**
 * Fetch data from Discogs API
 * @param {string} discogsUrl
 */
export async function fetchDiscogs(discogsUrl) {
	const parsed = parseDiscogsUrl(discogsUrl)
	if (!parsed) return null

	const {type, id} = parsed
	const apiUrl = `https://api.discogs.com/${type}s/${id}`

	try {
		const response = await fetch(apiUrl, {
			headers: {
				'User-Agent': 'R5MusicPlayer/1.0'
			}
		})

		if (!response.ok) {
			console.error('discogs_api_error', response.status, response.statusText)
			return null
		}

		const data = await response.json()
		return {
			...data,
			// Add metadata about the fetch
			_meta: {
				sourceUrl: discogsUrl,
				apiUrl,
				fetchedAt: new Date().toISOString()
			}
		}
	} catch (error) {
		console.error('fetch_discogs:error', {discogsUrl, apiUrl: apiUrl, error})
		return null
	}
}

/**
 * Search Discogs by title (for future automatic search)
 * @param {string} title
 */
export async function searchDiscogs(title) {
	if (!title) return null

	// Use the web search interface instead of API (which requires auth)
	// This doesn't return structured JSON, but can be used for building search URLs
	const query = encodeURIComponent(title)
	const searchUrl = `https://discogs.com/search?q=${query}&type=release`

	// For now, just return the search URL - we could scrape this later if needed
	// But the main use case is manual discogs_url entry anyway
	return {searchUrl, query: title}
}
