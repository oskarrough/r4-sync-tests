<script>
	import {pull as insertMusicBrainzMeta} from '$lib/metadata/musicbrainz'
	import {pullSingle as insertYouTubeMeta} from '$lib/metadata/youtube'
	import {pull as insertDiscogsMeta, hunt as huntDiscogsUrl} from '$lib/metadata/discogs'
	import {extractYouTubeId} from '$lib/utils.ts'
	import {logger} from '$lib/logger'

	const log = logger.ns('track-meta').seal()

	/**
	 * This component updates the track_meta table for this track
	 * with youtube_data, musicbrainz_data, and discogs_data
	 */

	const {track, showResult = false, onResult} = $props()

	let loading = $state(false)
	let error = $state()

	const ytid = $derived(track?.youtube_data?.id || extractYouTubeId(track?.url) || null)

	let result = $state()

	$effect(() => {
		if (!ytid) return
		loading = true
		Promise.resolve().then(async () => {
			try {
				// Parallel harvest phase
				const promises = []

				if (!track.youtube_data) {
					promises.push(insertYouTubeMeta(ytid))
				}

				if (!track.musicbrainz_data) {
					promises.push(insertMusicBrainzMeta(ytid, track.title))
				}

				const [youtube_data, musicbrainz_data] = await Promise.all(promises)

				// Sequential follow-up for discogs
				let discogs_data = null

				if (!track.discogs_data) {
					if (track.discogs_url) {
						discogs_data = await insertDiscogsMeta(ytid, track.discogs_url)
					} else {
						log.info('hunting discogs url', {title: track.title})
						const discoveredUrl = await huntDiscogsUrl(track.id, ytid, track.title)

						if (discoveredUrl) {
							log.info('found discogs url', {url: discoveredUrl})
							discogs_data = await insertDiscogsMeta(ytid, discoveredUrl)
						}
					}
				}

				result = {
					musicbrainz_data: musicbrainz_data || track.musicbrainz_data,
					youtube_data: youtube_data || track.youtube_data,
					discogs_data: discogs_data || track.discogs_data
				}
				log.info('metadata updated', result)
				onResult(result)
			} catch (err) {
				error = err instanceof Error ? err.message : String(err)
			} finally {
				loading = false
			}
		})
	})
</script>

{#if loading}
	<p>Loading meta data from YouTube, MusicBrainz, and Discogs...</p>
{:else if error}
	<p>Error: {error}</p>
{/if}

{#if result && showResult}
	<pre><code>{JSON.stringify(result, null, 2)}</code></pre>
{/if}
