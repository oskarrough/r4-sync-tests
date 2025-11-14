<script>
	import 'media-chrome'
	import '$lib/youtube-video-custom-element.js'
	import '$lib/soundcloud-player-custom-element.js'
	import {detectMediaProvider} from '$lib/utils.ts'
	import * as m from '$lib/paraglide/messages'

	const testUrls = [
		{
			title: 'YouTube - Ambient',
			url: 'https://www.youtube.com/watch?v=CWRQIorgdTE'
		},
		{
			title: 'YouTube - Jazz',
			url: 'https://www.youtube.com/watch?v=vmDDOFXSgAs'
		},
		{
			title: 'SoundCloud - Test Pressing',
			url: 'https://soundcloud.com/user-612196404/test-pressing-w-jamie-tiller'
		},
		{
			title: 'SoundCloud - sw0rdes',
			url: 'https://soundcloud.com/sw0rdes/im-sorry-i-drank-all-of-ur-wine'
		}
	]

	let currentUrl = $state(testUrls[0].url)
	let autoplay = $state(true)
	let userHasPlayed = $state(false)

	let youtubePlayer = $state()
	let soundcloudPlayer = $state()

	let trackType = $derived(detectMediaProvider(currentUrl))
	let mediaElement = $derived(trackType === 'youtube' ? youtubePlayer : soundcloudPlayer)

	// Player state tracking
	let paused = $state(true)
	let currentTime = $state(0)
	let duration = $state(0)
	let volume = $state(1)

	function selectTrack(url) {
		currentUrl = url
		userHasPlayed = true
	}

	function handlePlay() {
		console.log('▶️ play')
		userHasPlayed = true
		paused = false
	}

	function handlePause() {
		console.log('⏸️ pause')
		paused = true
	}

	function handleTimeUpdate() {
		if (mediaElement) {
			currentTime = mediaElement.currentTime
			duration = mediaElement.duration || 0
		}
	}

	function handleDurationChange() {
		console.log('⏱️ durationchange')
		if (mediaElement) {
			duration = mediaElement.duration || 0
		}
	}

	function handleError(event) {
		console.error('❌ error', event.target?.error)
	}

	function handleEnded() {
		console.log('⏹️ ended')
		paused = true
	}

	async function testTogglePlay() {
		if (!mediaElement) return
		if (mediaElement.paused) {
			await mediaElement.play()
		} else {
			await mediaElement.pause()
		}
	}

	async function seekToStart() {
		if (mediaElement) mediaElement.currentTime = 0
	}

	async function seekTo30() {
		if (mediaElement) mediaElement.currentTime = 30
	}

	async function setVolume(val) {
		if (mediaElement) mediaElement.volume = val
	}

	async function setMuted(val) {
		if (mediaElement) mediaElement.muted = val
	}
</script>

<svelte:head>
	<title>{m.page_title_media_chrome()}</title>
</svelte:head>

<div class="playground">
	<h1>{m.media_chrome_heading()}</h1>

	<section class="controls">
		<h2>{m.media_chrome_test_urls()}</h2>
		<ul>
			{#each testUrls as test (test.url)}
				<li>
					<button onclick={() => selectTrack(test.url)} class:active={currentUrl === test.url}>
						{test.title}
					</button>
				</li>
			{/each}
		</ul>

		<label>
			<input type="checkbox" bind:checked={autoplay} />
			{m.media_chrome_autoplay()}
		</label>

		<h3>{m.media_chrome_manual_controls()}</h3>
		<button onclick={testTogglePlay}>{m.media_chrome_toggle_js()}</button>
		<button onclick={seekToStart}>{m.media_chrome_seek_start()}</button>
		<button onclick={seekTo30}>{m.media_chrome_seek_30()}</button>
		<button onclick={() => setVolume(0.5)}>{m.media_chrome_volume_50()}</button>
		<button onclick={() => setVolume(1)}>{m.media_chrome_volume_100()}</button>
		<button onclick={() => setMuted(true)}>{m.media_chrome_mute()}</button>
		<button onclick={() => setMuted(false)}>{m.media_chrome_unmute()}</button>
	</section>

	<section class="player-info">
		<h2>{m.media_chrome_current_state()}</h2>
		<dl>
			<dt>{m.media_chrome_label_url()}</dt>
			<dd><code>{currentUrl}</code></dd>
			<dt>{m.media_chrome_label_provider()}</dt>
			<dd>{trackType}</dd>
			<dt>{m.media_chrome_label_user_played()}</dt>
			<dd>{userHasPlayed}</dd>
			<dt>{m.media_chrome_label_autoplay()}</dt>
			<dd>{autoplay}</dd>
			<dt>{m.media_chrome_label_paused()}</dt>
			<dd>{paused}</dd>
			<dt>{m.media_chrome_label_current_time()}</dt>
			<dd>{m.queue_seconds_suffix({seconds: currentTime.toFixed(2)})}</dd>
			<dt>{m.media_chrome_label_duration()}</dt>
			<dd>{m.queue_seconds_suffix({seconds: duration.toFixed(2)})}</dd>
			<dt>{m.media_chrome_label_volume()}</dt>
			<dd>{volume.toFixed(2)}</dd>
		</dl>
	</section>

	<section class="player-section">
		<h2>{m.media_chrome_player_heading()}</h2>
		<media-controller>
			{#if trackType === 'youtube'}
				<youtube-video
					slot="media"
					bind:this={youtubePlayer}
					src={currentUrl}
					autoplay={(autoplay && userHasPlayed) || undefined}
					onplay={handlePlay}
					onpause={handlePause}
					onended={handleEnded}
					onerror={handleError}
					ontimeupdate={handleTimeUpdate}
					ondurationchange={handleDurationChange}
				></youtube-video>
			{:else if trackType === 'soundcloud'}
				<soundcloud-player
					slot="media"
					bind:this={soundcloudPlayer}
					src={currentUrl}
					autoplay={(autoplay && userHasPlayed) || undefined}
					onplay={handlePlay}
					onpause={handlePause}
					onended={handleEnded}
					onerror={handleError}
					ontimeupdate={handleTimeUpdate}
					ondurationchange={handleDurationChange}
				></soundcloud-player>
			{/if}
			<media-loading-indicator slot="centered-chrome"></media-loading-indicator>

			<media-control-bar>
				<media-play-button></media-play-button>
				<media-seek-backward-button></media-seek-backward-button>
				<media-seek-forward-button></media-seek-forward-button>
				<media-time-range></media-time-range>
				<media-time-display showduration></media-time-display>
				<media-mute-button></media-mute-button>
				<media-volume-range></media-volume-range>
			</media-control-bar>
		</media-controller>
	</section>
</div>
