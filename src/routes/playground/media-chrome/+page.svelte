<script>
	import 'media-chrome'
	import '$lib/youtube-video-custom-element.js'
	import '$lib/soundcloud-player-custom-element.js'
	import {detectMediaProvider} from '$lib/utils.ts'

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
			title: 'SoundCloud - Eleanor Rigby',
			url: 'https://soundcloud.com/josefkenny/eleanor-rigby-pokemon-battle-theme'
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

<div class="playground">
	<h1>Media Chrome Playground</h1>

	<section class="controls">
		<h2>Test URLs</h2>
		<ul>
			{#each testUrls as test}
				<li>
					<button onclick={() => selectTrack(test.url)} class:active={currentUrl === test.url}>
						{test.title}
					</button>
				</li>
			{/each}
		</ul>

		<label>
			<input type="checkbox" bind:checked={autoplay} />
			Autoplay
		</label>

		<h3>Manual Controls</h3>
		<button onclick={testTogglePlay}>Toggle Play/Pause via JS</button>
		<button onclick={seekToStart}>Seek to Start</button>
		<button onclick={seekTo30}>Seek to 30s</button>
		<button onclick={() => setVolume(0.5)}>Volume 50%</button>
		<button onclick={() => setVolume(1)}>Volume 100%</button>
		<button onclick={() => setMuted(true)}>Mute</button>
		<button onclick={() => setMuted(false)}>Unmute</button>
	</section>

	<section class="player-info">
		<h2>Current State</h2>
		<dl>
			<dt>URL:</dt>
			<dd><code>{currentUrl}</code></dd>
			<dt>Provider:</dt>
			<dd>{trackType}</dd>
			<dt>User has played:</dt>
			<dd>{userHasPlayed}</dd>
			<dt>Autoplay:</dt>
			<dd>{autoplay}</dd>
			<dt>Paused:</dt>
			<dd>{paused}</dd>
			<dt>Current Time:</dt>
			<dd>{currentTime.toFixed(2)}s</dd>
			<dt>Duration:</dt>
			<dd>{duration.toFixed(2)}s</dd>
			<dt>Volume:</dt>
			<dd>{volume.toFixed(2)}</dd>
		</dl>
	</section>

	<section class="player-section">
		<h2>Player</h2>
		<media-controller>
			<youtube-video
				slot={trackType === 'youtube' ? 'media' : undefined}
				bind:this={youtubePlayer}
				src={trackType === 'youtube' ? currentUrl : undefined}
				autoplay={autoplay && userHasPlayed || undefined}
				hidden={trackType !== 'youtube'}
				onplay={handlePlay}
				onpause={handlePause}
				onended={handleEnded}
				onerror={handleError}
				ontimeupdate={handleTimeUpdate}
				ondurationchange={handleDurationChange}
			></youtube-video>
			<soundcloud-player
				slot={trackType === 'soundcloud' ? 'media' : undefined}
				bind:this={soundcloudPlayer}
				src={trackType === 'soundcloud' ? currentUrl : undefined}
				autoplay={autoplay && userHasPlayed || undefined}
				hidden={trackType !== 'soundcloud'}
				onplay={handlePlay}
				onpause={handlePause}
				onended={handleEnded}
				onerror={handleError}
				ontimeupdate={handleTimeUpdate}
				ondurationchange={handleDurationChange}
			></soundcloud-player>
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

<style>
	.playground {
		padding: 1rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	h1 {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}

	h3 {
		font-size: 1rem;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	.controls,
	.player-info,
	.player-section {
		margin-bottom: 2rem;
		padding: 1rem;
		background: var(--background-color, #f5f5f5);
		border-radius: 4px;
	}

	.controls ul {
		list-style: none;
		padding: 0;
		margin-bottom: 1rem;
	}

	.controls li {
		margin-bottom: 0.5rem;
	}

	.controls button {
		width: 100%;
		text-align: left;
		padding: 0.5rem 1rem;
	}

	.controls button.active {
		background: var(--primary-color, #007bff);
		color: white;
	}

	.player-info dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
	}

	.player-info dt {
		font-weight: bold;
	}

	.player-info dd {
		margin: 0;
	}

	code {
		font-size: 0.9em;
		background: var(--background-color-alt, #e5e5e5);
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		word-break: break-all;
	}

	media-controller {
		width: 100%;
		aspect-ratio: 16 / 9;
	}
</style>
