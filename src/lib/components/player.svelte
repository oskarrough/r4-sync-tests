<script>
	import {tick} from 'svelte'
	import 'media-chrome'
	import 'youtube-video-element'
	import {togglePlayerExpanded} from '$lib/api'
	import {togglePlay, next, previous, toggleShuffle, play, pause} from '$lib/api/player'
	import {appState} from '$lib/app-state.svelte'
	import {logger} from '$lib/logger'
	import {extractYouTubeId} from '$lib/utils'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'
	import LinkEntities from '$lib/components/link-entities.svelte'
	import {r5} from '$lib/r5'
	import {pg} from '$lib/r5/db'

	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').Channel} Channel */

	const log = logger.ns('player').seal()

	// The YouTube player element
	let yt = $state()

	/** @type {Track|undefined} */
	let track = $state()

	/** @type {Channel|undefined} */
	let channel = $state()

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {string[]} */
	let activeQueue = $derived(appState.shuffle ? appState.playlist_tracks_shuffled || [] : trackIds)

	let didPlay = $state(false)
	const canPlay = $derived(Boolean(channel && track))
	const autoplay = $derived(didPlay ? 1 : 0)
	const isListeningToBroadcast = $derived(Boolean(appState.listening_to_channel_id))

	/** @type {string} */
	let trackImage = $derived.by(() => {
		if (!track?.url) return ''
		const ytid = extractYouTubeId(track.url)
		return ytid ? `https://i.ytimg.com/vi/${ytid}/mqdefault.jpg` : '' // default, mqdefault, hqdefault, sddefault, maxresdefault
	})

	$effect(async () => {
		const tid = appState.playlist_track
		const trackChanged = tid && tid !== track?.id
		if (trackChanged) {
			// debugger
			const ytplayer = yt || document.querySelector('youtube-video')
			const paused = ytplayer.paused
			// const wasPlaying = track && yt && !paused
			await setChannelFromTrack(tid)
			log.log('track changed', {track: track?.title, yt, paused, didPlay, autoplay})
			// Only auto-play if we were already playing when track changed
			if (didPlay && yt) {
				log.log('Auto-playing next track, yt ready:', !!yt, 'didPlay:', didPlay)
				// Wait for YouTube element to be ready before playing
				yt.loadComplete.then(() => {
					log.log('YouTube loadComplete, calling play')
					play(yt)
				})
			}
		}
	})

	/** @param {string} tid */
	async function setChannelFromTrack(tid) {
		if (!tid || tid === track?.id) return
		track = (await pg.sql`select * from tracks_with_meta where id = ${tid}`).rows[0]
		channel = (await r5.channels({slug: track.channel_slug}))[0]
	}

	function handlePlay() {
		log.log('handlePlay')
		didPlay = true
		appState.is_playing = true
	}

	function handlePause() {
		log.log('handlePause')
		appState.is_playing = false
	}

	/** @param {any} event */
	function handleError(event) {
		const code = event.target.error.code
		const msg = `youtube_error_${code}`
		log.warn(msg)
		next(track, activeQueue, msg)
	}

	function handleEndTrack() {
		next(track, activeQueue, 'track_completed')
	}

	function applyInitialVolume() {
		yt.volume = appState.volume
		yt.muted = appState.volume === 0
	}

	function handleVolumeChange(e) {
		const {volume} = e.target
		if (appState.volume === volume) return
		appState.volume = volume
		log.log('volumeChange', volume)
	}

	// Pre-buffer video if it's in cued state for smooth playback
	async function prebuffer() {
		await tick()
		const playerState = yt?.api?.getPlayerState?.()
		if (playerState === 5 && !didPlay) {
			//log.log('prebuffering')
			play(yt)
			setTimeout(() => {
				pause(yt)
				//log.log('prebuffering complete')
			}, 200)
		}
	}
</script>

<div class={['player', appState.player_expanded ? 'expanded' : 'compact']}>
	{@render channelHeader()}

	{#if !channel}
		<p style="margin-left: 0.5rem">Find some sweet music</p>
	{/if}

	{#if channel}
		{@render trackContent()}
	{/if}

	<media-controller id="r5" data-clickable="true">
		<youtube-video
			slot="media"
			bind:this={yt}
			src={track?.url}
			{autoplay}
			playsinline={1}
			volume={appState.volume}
			muted={appState.volume === 0}
			onloadcomplete={() => {
				prebuffer()
				applyInitialVolume()
			}}
			onplay={handlePlay}
			onpause={handlePause}
			onended={handleEndTrack}
			onerror={handleError}
			volumechange={handleVolumeChange}
		></youtube-video>
		<media-loading-indicator slot="centered-chrome"></media-loading-indicator>
	</media-controller>

	<menu>
		<media-control-bar mediacontroller="r5">
			{@render btnShuffle()}
			{@render btnPrev()}
			<!-- <media-play-button class="btn"></media-play-button> -->
			{@render btnPlay()}
			{@render btnNext()}
			<media-time-range></media-time-range>
			<media-time-display showduration></media-time-display>
			<media-mute-button class="btn"></media-mute-button>
			<media-volume-range></media-volume-range>
			{@render btnToggleVideo()}
		</media-control-bar>
	</menu>

	<media-control-bar class="timebar" mediacontroller="r5">
		<media-time-range></media-time-range>
		<media-time-display showduration></media-time-display>
	</media-control-bar>
</div>

{#snippet btnPrev()}
	<button onclick={() => previous(track, activeQueue, 'user_prev')} class="prev">
		<Icon icon="previous-fill" />
	</button>
{/snippet}

{#snippet btnNext()}
	<button onclick={() => next(track, activeQueue, 'user_next')} disabled={!canPlay} class="next">
		<Icon icon="next-fill" />
	</button>
{/snippet}

{#snippet btnPlay()}
	<button onclick={() => togglePlay(yt)} disabled={!canPlay} class="play">
		<Icon icon={appState.is_playing ? 'pause' : 'play-fill'} />
	</button>
{/snippet}

{#snippet btnShuffle()}
	<button
		onclick={(e) => {
			e.preventDefault()
			e.stopPropagation()
			toggleShuffle(trackIds)
		}}
		class={['shuffle', {active: appState.shuffle}]}
	>
		<Icon icon="shuffle" />
	</button>
{/snippet}

<!-- {#snippet btnEject()}
	<button onclick={() => eject()}>
		<Icon icon="eject" />
	</button>
{/snippet} -->

{#snippet btnToggleVideo()}
	<button onclick={() => togglePlayerExpanded()} title="Show/hide video" class="expand">
		<Icon icon="fullscreen" />
		<!-- <Icon icon="video" /> -->
	</button>
{/snippet}

{#snippet channelHeader()}
	{#if channel}
		<header class="channel">
			<a href={`/${channel.slug}`}>
				<ChannelAvatar id={channel.image} alt={channel.name} />
			</a>
			<h2><a href={`/${channel.slug}`}>{channel.name}</a></h2>
		</header>
	{/if}
{/snippet}

{#snippet trackContent()}
	{#if channel && track}
		{#if !appState.hide_track_artwork}<img
				class="artwork"
				src={trackImage}
				alt={track.title}
			/>{/if}
		<div class="text">
			<h3>
				{#if isListeningToBroadcast}
					<span class="broadcast-indicator">🔴 LIVE</span>
				{/if}
				<a href={`/${channel.slug}/tracks/${track.id}`}>{track.title}</a>
			</h3>
			{#if track.description}
				<p><small><LinkEntities text={track.description} {track} /></small></p>
			{/if}
		</div>
	{/if}
{/snippet}
