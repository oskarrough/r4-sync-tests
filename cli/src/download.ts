import {$} from 'bun'
import {Database} from 'bun:sqlite'
import type {Track, SQLTrack} from './schema.ts'

/** Downloads the audio from a URL (supported by yt-dlp) */
export async function downloadAudio(
	url: string,
	filepath: string,
	metadataDescription: string,
	premium = false,
	poToken?: string,
) {
	if (!premium)
		return $`yt-dlp -f 'bestaudio[ext=m4a]' --no-playlist --restrict-filenames --output ${filepath} --parse-metadata "${metadataDescription}:%(meta_comment)s" --embed-metadata --quiet --progress ${url} --cookies-from-browser firefox`

	if (!poToken) {
		throw new Error('Premium download requires a PO Token. Please provide it with --poToken parameter.')
	}

	return $`yt-dlp -f 'bestaudio[ext=m4a]' --no-playlist --restrict-filenames --output ${filepath} --parse-metadata "${metadataDescription}:%(meta_comment)s" --embed-metadata --quiet --progress ${url} --cookies-from-browser firefox --extractor-args "youtube:player-client=web_music;po_token=web_music.gvs+${poToken}"`
}

/** Downloads the URL of a track to disk, and updates the track in the local database.
 * Pass simulate=true to only log actions without making changes.
 */
export async function downloadTrack(
	t: SQLTrack | Track,
	filename: string,
	db: Database,
	simulate = false,
	premium = false,
	poToken?: string,
) {
	// Validate inputs to prevent errors
	if (!t || !t.id || !t.url) {
		console.error('Invalid track data provided to downloadTrack')
		return
	}

	if (simulate) {
		console.log(`Simulation: would download "${t.title}" from ${t.url} to ${filename}`)
		return
	}

	try {
		await downloadAudio(t.url, filename, t.description || '', premium, poToken)

		try {
			db.query(`UPDATE tracks SET files = $files, lastError = $lastError WHERE id = $id;`).run({
				id: t.id,
				files: filename,
				lastError: null,
			})
		} catch (dbErr) {
			console.error('Error updating database after download:', dbErr)
		}
	} catch (err: unknown) {
		// note, the stderr is logged to the console before this..
		let errorMessage = 'Error downloading track'

		// Try to extract a more detailed error message if available
		if (err && typeof err === 'object') {
			// Check for stderr property (common in shell command errors)
			if ('stderr' in err && err.stderr) {
				errorMessage = `${err.stderr.toString()}`
			}
			// Check for message property (common in standard Error objects)
			else if ('message' in err && err.message) {
				errorMessage = `${err.message}`
			}
		}

		console.error('Download error details:', errorMessage)

		t.lastError = errorMessage

		try {
			db.query(`UPDATE tracks SET files = $files, lastError = $lastError WHERE id = $id;`).run({
				id: t.id,
				files: null,
				lastError: t.lastError,
			})
		} catch (dbErr) {
			console.error('Error updating database after download failure:', dbErr)
		}
	}
}
