import {getPg} from '../r5/db.js'
import {logger} from '$lib/logger'

const log = logger.ns('metadata/discogs').seal()

/**
 * Fetch Discogs data from URL and save to track_meta
 * @param {string} ytid YouTube video ID
 * @param {string} discogsUrl Discogs release/master URL
 * @returns {Promise<Object|null>} Discogs data
 */
export async function pull(ytid, discogsUrl) {
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
		log.info('updated', discogsData)
		return discogsData
	} catch (error) {
		log.error('insert failed', {ytid, discogsUrl, error})
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
 * Fetch Discogs data without saving
 * @param {string} discogsUrl Discogs URL
 * @returns {Promise<Object|null>} Discogs data
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
			log.error('api error', {status: response.status, statusText: response.statusText})
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
		log.error('fetch failed', {discogsUrl, apiUrl, error})
		return null
	}
}

/**
 * Search Discogs by title (for future automatic search)
 * @param {string} title
 * @returns {Promise<Object|null>} Search URL object
 */
export async function searchUrl(title) {
	if (!title) return null

	// Use the web search interface instead of API (which requires auth)
	// This doesn't return structured JSON, but can be used for building search URLs
	const query = encodeURIComponent(title)
	const searchUrl = `https://discogs.com/search?q=${query}&type=release`

	// For now, just return the search URL - we could scrape this later if needed
	// But the main use case is manual discogs_url entry anyway
	return {searchUrl, query: title}
}

/**
 * Hunt for Discogs URL via MusicBrainz chain and save URL to tracks table
 * @param {string} trackId Track UUID
 * @param {string} ytid YouTube video ID
 * @param {string} title Track title for search
 * @returns {Promise<string|null>} Discovered Discogs URL
 */
export async function hunt(trackId, ytid, title) {
	if (!ytid || !title) return null

	try {
		// Check if we already have MusicBrainz data locally
		let musicbrainzData = null

		// Check local track_meta table
		const pg = await getPg()
		const result = await pg.sql`
			SELECT musicbrainz_data 
			FROM track_meta 
			WHERE ytid = ${ytid}
		`
		musicbrainzData = result.rows[0]?.musicbrainz_data

		// If we have cached MusicBrainz data with releases, use it
		if (musicbrainzData?.releases?.length > 0) {
			log.info('using cached musicbrainz data', {title})
			// Check each release for Discogs URL
			for (const release of musicbrainzData.releases) {
				if (release.id) {
					const discogsUrl = await getDiscogsUrlFromRelease(release.id)
					if (discogsUrl) {
						await saveDiscogsUrl(trackId, discogsUrl)
						return discogsUrl
					}
				}
			}
		}

		// Otherwise, do fresh search
		log.info('searching musicbrainz', {title})

		// Step 1: Search for recording by title
		const recording = await searchMusicBrainzRecording(title)
		if (!recording) return null

		// Step 2: Get releases for this recording
		const releases = await getMusicBrainzReleases(recording.id)
		if (!releases.length) return null

		// Step 3: Find discogs URL in release relationships
		for (const release of releases) {
			const discogsUrl = await getDiscogsUrlFromRelease(release.id)
			if (discogsUrl) {
				await saveDiscogsUrl(trackId, discogsUrl)
				return discogsUrl
			}
		}

		return null
	} catch (error) {
		log.error('discogs hunt failed', {ytid, title, error})
		return null
	}
}

/**
 * Search MusicBrainz for recordings matching title
 */
async function searchMusicBrainzRecording(title) {
	// Clean title for better matching
	const cleanTitle = title
		.replace(/\s*\([^)]+\)$/, '') // remove (feat. etc)
		.replace(/\s*\[[^\]]+\]$/, '') // remove [remix etc]
		.trim()

	// Extract artist - title pattern
	const parts = cleanTitle.split(' - ')
	let query = `recording:"${cleanTitle}"`

	if (parts.length >= 2) {
		const [artist, track] = parts
		query = `artist:"${artist.trim()}" AND recording:"${track.trim()}"`
	}

	const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=5`

	try {
		const response = await fetch(url, {
			headers: {'User-Agent': 'R5MusicPlayer/1.0 (contact@radio4000.com)'}
		})

		if (!response.ok) return null

		const data = await response.json()

		if (data.recordings?.length > 0) {
			log.info('musicbrainz found recordings', {count: data.count, title})
		}

		return data.recordings?.[0] || null
	} catch (error) {
		log.error('musicbrainz recording search failed', {error})
		return null
	}
}

/**
 * Get releases for a recording ID
 */
async function getMusicBrainzReleases(recordingId) {
	const url = `https://musicbrainz.org/ws/2/recording/${recordingId}?inc=releases&fmt=json`

	try {
		const response = await fetch(url, {
			headers: {'User-Agent': 'R5MusicPlayer/1.0 (contact@radio4000.com)'}
		})

		if (!response.ok) return []

		const data = await response.json()
		return data.releases || []
	} catch (error) {
		log.error('musicbrainz releases fetch failed', {error})
		return []
	}
}

/**
 * Extract Discogs URL from release relationships
 */
async function getDiscogsUrlFromRelease(releaseId) {
	const url = `https://musicbrainz.org/ws/2/release/${releaseId}?inc=url-rels&fmt=json`

	try {
		const response = await fetch(url, {
			headers: {'User-Agent': 'R5MusicPlayer/1.0 (contact@radio4000.com)'}
		})

		if (!response.ok) return null

		const data = await response.json()
		const urlRels = data.relations?.filter(
			(rel) => rel.type === 'discogs' && rel.url?.resource?.includes('discogs.com')
		)

		return urlRels?.[0]?.url?.resource || null
	} catch (error) {
		log.error('discogs url extraction failed', {error})
		return null
	}
}

/**
 * Save discovered Discogs URL to track
 * @param {string} trackId Track UUID
 * @param {string} discogsUrl Discovered Discogs URL
 */
async function saveDiscogsUrl(trackId, discogsUrl) {
	if (!trackId || !discogsUrl) return false

	try {
		const pg = await getPg()
		await pg.sql`
			UPDATE tracks 
			SET discogs_url = ${discogsUrl}
			WHERE id = ${trackId}
		`
		log.info('saved discogs url', {trackId})
		return true
	} catch (error) {
		log.error('save discogs url failed', {trackId, discogsUrl, error})
		return false
	}
}

/**
 * Read Discogs metadata from local track_meta
 * @param {string[]} ytids YouTube video IDs
 * @returns {Promise<Object[]>} Local metadata
 */
export async function local(ytids) {
	const pg = await getPg()
	const res = await pg.sql`
		SELECT * FROM track_meta 
		WHERE ytid = ANY(${ytids}) AND discogs_data IS NOT NULL
	`
	return res.rows
}

/**
 * Test the chain with a known track
 */
export async function testAutoDiscovery() {
	log.info('testing auto-discovery', {track: 'Daft Punk - Get Lucky'})

	const discogsUrl = await hunt('test-track-id', '09m-zZN-tOQ', 'Daft Punk - Get Lucky')
	log.info('test result', {discogsUrl})

	return discogsUrl
}
