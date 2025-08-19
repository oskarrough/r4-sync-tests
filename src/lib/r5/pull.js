import * as channels from './channels.js'
import * as tracks from './tracks.js'

/** Pull both channels and tracks for a slug */
export async function everything(slug) {
	const channelResults = await channels.pull({slug})
	const trackResults = await tracks.pull({slug})
	return {channels: channelResults, tracks: trackResults}
}
