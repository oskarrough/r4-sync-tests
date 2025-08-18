import {spawn} from 'node:child_process'
import {mkdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import pLimit from 'p-limit'
import filenamify from 'filenamify'
import {extractYouTubeId} from '../utils.js'

/**
 * Downloads audio from a URL using yt-dlp
 */
async function downloadAudio(url, filepath, metadataDescription = '', premium = false, poToken) {
	const args = [
		'-f',
		'bestaudio[ext=m4a]',
		'--no-playlist',
		'--restrict-filenames',
		'--output',
		filepath,
		'--parse-metadata',
		`${metadataDescription}:%(meta_comment)s`,
		'--embed-metadata',
		'--quiet',
		'--progress',
		url,
		'--cookies-from-browser',
		'firefox'
	]

	if (premium) {
		if (!poToken) {
			throw new Error(
				'Premium download requires a PO Token. Please provide it with --poToken parameter.'
			)
		}
		args.push(
			'--extractor-args',
			`youtube:player-client=web_music;po_token=web_music.gvs+${poToken}`
		)
	}

	return new Promise((resolve, reject) => {
		const child = spawn('yt-dlp', args, {stdio: 'inherit'})
		child.on('close', (code) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`yt-dlp exited with code ${code}`))
			}
		})
		child.on('error', reject)
	})
}

/**
 * Create safe filename from track data
 */
function toFilename(track, folderPath) {
	if (!track.title || typeof track.title !== 'string') {
		throw new Error(`Invalid track title: ${JSON.stringify(track.title)}`)
	}

	const youtubeId = extractYouTubeId(track.url)
	if (!youtubeId) {
		throw new Error(`Could not extract YouTube ID from URL: ${track.url}`)
	}

	const cleanTitle = filenamify(track.title, {replacement: ' ', maxLength: 255})
	return `${folderPath}/${cleanTitle} [${youtubeId}].m4a`
}

/**
 * Download a single track
 */
async function downloadTrack(track, folderPath, options = {}) {
	const {simulate = false, premium = false, poToken} = options

	if (!track?.url || !track?.title) {
		console.error('Invalid track data:', track?.title || 'Unknown')
		return {success: false, error: 'Invalid track data'}
	}

	try {
		const filename = toFilename(track, folderPath)

		if (simulate) {
			console.log(`Would download: "${track.title}" to ${filename}`)
			return {success: true, filename, simulated: true}
		}

		// Check if file already exists
		if (existsSync(filename)) {
			console.log(`Skipping existing: ${track.title}`)
			return {success: true, filename, skipped: true}
		}

		await downloadAudio(track.url, filename, track.description || '', premium, poToken)
		console.log(`Downloaded: ${track.title}`)
		return {success: true, filename}
	} catch (error) {
		const errorMsg = error.stderr?.toString() || error.message || 'Unknown error'
		console.error(`Failed to download "${track.title}": ${errorMsg}`)
		return {success: false, error: errorMsg}
	}
}

/**
 * Download all tracks for a channel
 */
export async function downloadChannel(slug, folderPath, options = {}) {
	const {r5, concurrency = 5, simulate = false, premium = false, poToken} = options

	// Create folder structure
	const channelFolder = `${folderPath}/${slug}`
	const tracksFolder = `${channelFolder}/tracks`

	if (!simulate) {
		await mkdir(tracksFolder, {recursive: true})
	} else {
		console.log(`Would create folder: ${tracksFolder}`)
	}

	// Fetch tracks with fallback priority: r4 > v1 > local
	console.log(`Fetching tracks for channel: ${slug}`)
	let tracks = []
	let source = 'unknown'

	try {
		tracks = await r5.tracks.r4({slug})
		if (!tracks?.length) throw new Error('No tracks from r4')
		source = 'r4'
	} catch {
		try {
			tracks = await r5.tracks.v1({slug})
			if (!tracks?.length) throw new Error('No tracks from v1')
			source = 'v1'
		} catch {
			tracks = await r5.tracks.local({slug})
			source = 'local'
		}
	}

	console.log(`Found ${tracks.length} tracks from ${source}`)

	if (!tracks?.length) {
		console.log('No tracks found in any source')
		return {downloaded: 0, failed: 0, skipped: 0}
	}

	console.log(`Found ${tracks.length} tracks`)

	// Download with concurrency limit
	const limit = pLimit(concurrency)
	const results = await Promise.all(
		tracks.map((track) =>
			limit(() => downloadTrack(track, tracksFolder, {simulate, premium, poToken}))
		)
	)

	// Count results
	const downloaded = results.filter((r) => r.success && !r.skipped && !r.simulated).length
	const failed = results.filter((r) => !r.success).length
	const skipped = results.filter((r) => r.skipped).length
	const simulated = results.filter((r) => r.simulated).length

	// Summary
	if (simulate) {
		console.log(`\nSimulation complete: ${simulated} tracks would be downloaded`)
	} else {
		console.log(`\nDownload complete:`)
		console.log(`- Downloaded: ${downloaded}`)
		console.log(`- Skipped: ${skipped}`)
		console.log(`- Failed: ${failed}`)
	}

	return {downloaded, failed, skipped, simulated}
}
