<script>
	import {pullMusicBrainz} from '$lib/sync/musicbrainz'
	import {pullTrackMetaYouTube} from '$lib/sync/youtube'
	import {pullDiscogs} from '$lib/sync/discogs'
	import {findDiscogsViaMusicBrainz, saveDiscogsUrl} from '$lib/sync/auto-discogs'
	import {extractYouTubeId} from '$lib/utils.ts'

	/**
	 * This component updates the track_meta table for this track
	 * with youtube_data, musicbrainz_data, and discogs_data
	 */

	const {track} = $props()

	let loading = $state(false)
	let error = $state()

	const hasMeta = $derived(track.youtube_data || track.musicbrainz_data || track.discogs_data)
	const ytid = $derived(track?.youtube_data?.id || extractYouTubeId(track?.url) || null)

	let result = $state()

	$effect(() => {
		if (!ytid || hasMeta) return
		loading = true
		Promise.resolve().then(async () => {
			try {
				// Fetch YouTube and MusicBrainz data first
				const musicbrainz_data = await pullMusicBrainz(ytid, track.title)
				const yt = await pullTrackMetaYouTube([ytid])
				const youtube_data = yt[0]?.status === 'fulfilled' ? yt[0].value : null

				// Handle Discogs data
				let discogs_data = null

				if (track.discogs_url) {
					// If track already has discogs_url, fetch the data
					discogs_data = await pullDiscogs(ytid, track.discogs_url)
				} else {
					// Try auto-discovery via MusicBrainz chain
					console.log('Attempting auto-discovery for', track.title)
					const discoveredUrl = await findDiscogsViaMusicBrainz(
						ytid,
						track.title,
						{musicbrainz_data} // Pass existing data to avoid re-fetching
					)

					if (discoveredUrl) {
						console.log('Auto-discovered Discogs URL:', discoveredUrl)
						// Save the discovered URL to the track
						await saveDiscogsUrl(track.id, discoveredUrl)
						// Fetch the Discogs data
						discogs_data = await pullDiscogs(ytid, discoveredUrl)
					}
				}

				result = {musicbrainz_data, youtube_data, discogs_data}
				console.log({musicbrainz_data, youtube_data, discogs_data})
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

{#if result}
	<pre><code>{JSON.stringify(result, null, 2)}</code></pre>
{/if}
