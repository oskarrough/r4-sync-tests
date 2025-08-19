/**
 * Auto-discover Discogs releases via MusicBrainz
 * Chain: ytid → recording → release → discogs URL
 */

import {getPg} from '../r5/db.js'

/**
 * Find Discogs release URL for a track via MusicBrainz
 * Checks local cache first to avoid redundant API calls
 * @param {string} ytid YouTube video ID
 * @param {string} title Track title for fallback search
 * @param {object} existingMeta Optional existing track_meta to avoid re-fetching
 * @returns {Promise<string|null>} Discogs URL or null
 */
export async function findDiscogsViaMusicBrainz(ytid, title, existingMeta = null) {
	if (!ytid || !title) return null

	try {
		// Check if we already have MusicBrainz data locally
		let musicbrainzData = existingMeta?.musicbrainz_data

		if (!musicbrainzData) {
			// Check local track_meta table
			const pg = await getPg()
			const result = await pg.sql`
				SELECT musicbrainz_data 
				FROM track_meta 
				WHERE ytid = ${ytid}
			`
			musicbrainzData = result.rows[0]?.musicbrainz_data
		}

		// If we have cached MusicBrainz data with releases, use it
		if (musicbrainzData?.releases?.length > 0) {
			console.log('Using cached MusicBrainz data for', title)
			// Check each release for Discogs URL
			for (const release of musicbrainzData.releases) {
				if (release.id) {
					const discogsUrl = await getDiscogsUrlFromRelease(release.id)
					if (discogsUrl) return discogsUrl
				}
			}
		}

		// Otherwise, do fresh search
		console.log('Searching MusicBrainz for', title)

		// Step 1: Search for recording by title
		const recording = await searchMusicBrainzRecording(title)
		if (!recording) return null

		// Step 2: Get releases for this recording
		const releases = await getMusicBrainzReleases(recording.id)
		if (!releases.length) return null

		// Step 3: Find discogs URL in release relationships
		for (const release of releases) {
			const discogsUrl = await getDiscogsUrlFromRelease(release.id)
			if (discogsUrl) return discogsUrl
		}

		return null
	} catch (error) {
		console.error('find_discogs_via_musicbrainz:error', {ytid, title, error})
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
			console.log('MusicBrainz found', data.count, 'recordings for', title)
		}

		return data.recordings?.[0] || null
	} catch (error) {
		console.error('search_musicbrainz_recording:error', error)
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
		console.error('get_musicbrainz_releases:error', error)
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
		console.error('get_discogs_url_from_release:error', error)
		return null
	}
}

/**
 * Save discovered Discogs URL to track
 * @param {string} trackId Track UUID
 * @param {string} discogsUrl Discovered Discogs URL
 */
export async function saveDiscogsUrl(trackId, discogsUrl) {
	if (!trackId || !discogsUrl) return false

	try {
		const pg = await getPg()
		await pg.sql`
			UPDATE tracks 
			SET discogs_url = ${discogsUrl}
			WHERE id = ${trackId}
		`
		console.log('Saved discogs_url for track', trackId)
		return true
	} catch (error) {
		console.error('save_discogs_url:error', {trackId, discogsUrl, error})
		return false
	}
}

/**
 * Test the chain with a known track
 */
export async function testAutoDiscovery() {
	console.log('Testing auto-discovery with "Daft Punk - Get Lucky"')

	const discogsUrl = await findDiscogsViaMusicBrainz('09m-zZN-tOQ', 'Daft Punk - Get Lucky')
	console.log('Found Discogs URL:', discogsUrl)

	return discogsUrl
}
