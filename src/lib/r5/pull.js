import * as channels from './channels.js'
import * as tracks from './tracks.js'

/** Pull both channels and tracks for a slug
 * @param {string|{slug: string}} slugOrOptions
 */
export async function everything(slugOrOptions) {
	const slug = typeof slugOrOptions === 'string' ? slugOrOptions : slugOrOptions.slug
	const channelResults = await channels.pull({slug})
	const trackResults = await tracks.pull({slug})
	return {channels: channelResults, tracks: trackResults}
}
