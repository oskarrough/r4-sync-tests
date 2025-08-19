<script>
	import {pullMusicBrainz} from '$lib/sync/musicbrainz'
	import {pullTrackMetaYouTube} from '$lib/sync/youtube'
	import {extractYouTubeId} from '$lib/utils.ts'

	/**
	 * This component updates the track_meta table for this track
	 * with youtube_data and musicbrainz_data
	 */

	const {track} = $props()

	let loading = $state(false)
	let error = $state()

	const hasMeta = $derived(track.youtube_data || track.musicbrainz_data)
	const ytid = $derived(track?.youtube_data?.id || extractYouTubeId(track?.url) || null)

	let result = $state()

	$effect(() => {
		if (!ytid || hasMeta) return
		loading = true
		Promise.resolve().then(async () => {
			try {
				const musicbrainz_data = await pullMusicBrainz(ytid, track.title)
				const yt = await pullTrackMetaYouTube([ytid])
				const youtube_data = yt[0]?.status === 'fulfilled' ? yt[0].value : null
				result = {musicbrainz_data, youtube_data}
				console.log({musicbrainz_data, youtube_data})
			} catch (err) {
				error = err instanceof Error ? err.message : String(err)
			} finally {
				loading = false
			}
		})
	})
</script>

{#if loading}
	<p>Loading meta data from YouTube and MusicBrainz...</p>
{:else if error}
	<p>Error: {error}</p>
{/if}

{#if result}
	<pre><code>{JSON.stringify(result, null, 2)}</code></pre>
{/if}
