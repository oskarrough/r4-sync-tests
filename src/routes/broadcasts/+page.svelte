<script>
	import {sdk} from '@radio4000/sdk'
	import {
		joinBroadcast,
		leaveBroadcast,
		syncLocalBroadcastState
	} from '$lib/broadcast'
	import {r4} from '$lib/r4'
	import {r5} from '$lib/r5'
	import {appState} from '$lib/app-state.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import BroadcastControls from '$lib/components/broadcast-controls.svelte'
	import {logger} from '$lib/logger'
	import {timeAgo} from '$lib/utils'

	const log = logger.ns('broadcasts-page').seal()

	/** @type {import('$lib/types').BroadcastWithChannel[]} */
	let activeBroadcasts = $state([])
	/** @type {Record<string, any>} */
	let tracks = $state({})
	let subscriptionStatus = $state('disconnected')
	let loadingError = $state(null)

	async function loadBroadcasts() {
		try {
			loadingError = null
			const data = await r4.broadcasts.readBroadcastsWithChannel()
			const previousCount = activeBroadcasts.length
			activeBroadcasts = data

			// Load tracks separately for each broadcast
			for (const broadcast of data) {
				if (broadcast.track_id && !tracks[broadcast.track_id]) {
					try {
						// First try to find track locally
						const localTracks = await r5.tracks.local()
						const track = localTracks.find(t => t.id === broadcast.track_id)
						if (track) {
							tracks[broadcast.track_id] = track
						} else {
							// Track not found locally - need to pull the channel
							log.log('track_missing_locally', {track_id: broadcast.track_id, channel_slug: broadcast.channels.slug})
							
							try {
								await r5.channels.pull({slug: broadcast.channels.slug})
								await r5.tracks.pull({slug: broadcast.channels.slug})
								
								// Try again after pulling
								const updatedTracks = await r5.tracks.local({slug: broadcast.channels.slug})
								const foundTrack = updatedTracks.find(t => t.id === broadcast.track_id)
								if (foundTrack) {
									tracks[broadcast.track_id] = foundTrack
									log.log('track_loaded_after_pull', {track_id: broadcast.track_id, channel_slug: broadcast.channels.slug})
								}
							} catch (pullError) {
								log.error('pull_channel_for_track_failed', {
									track_id: broadcast.track_id, 
									channel_slug: broadcast.channels.slug,
									error: /** @type {Error} */ (pullError).message
								})
							}
						}
					} catch (error) {
						log.error('load_track_failed', {track_id: broadcast.track_id, error: /** @type {Error} */ (error).message})
					}
				}
			}

			syncLocalBroadcastState(data, appState.channels?.[0])

			if (data.length !== previousCount) {
				log.log('broadcasts_count_changed', {
					previous: previousCount,
					current: data.length,
					broadcasts: data.map((b) => ({
						channel_id: b.channel_id,
						channel_slug: b.channels.slug,
						track_id: b.track_id
					}))
				})
			}
		} catch (error) {
			loadingError = /** @type {Error} */ (error).message
			log.error('load_broadcasts_failed', {error: /** @type {Error} */ (error).message})
		}
	}

	$effect(() => {
		log.log('page_mounted')
		loadBroadcasts()

		const broadcastChannel = sdk.supabase
			.channel('broadcasts-page')
			.on(
				'postgres_changes',
				{event: '*', schema: 'public', table: 'broadcast'},
				async (payload) => {
					const channelId = payload.new?.channel_id || payload.old?.channel_id
					log.log('realtime_event', {
						event: payload.eventType,
						channel_id: channelId,
						track_id: payload.new?.track_id,
						old_track_id: payload.old?.track_id
					})

					if (payload.eventType === 'DELETE' && channelId) {
						activeBroadcasts = activeBroadcasts.filter((b) => b.channel_id !== channelId)
						log.log('broadcast_removed_from_ui', {channel_id: channelId})
						return // Skip full reload for deletes
					}

					await loadBroadcasts()
				}
			)
			.subscribe((status) => {
				subscriptionStatus = status
				log.log('subscription_status_changed', {status})
			})

		return () => {
			log.log('page_unmounted')
			broadcastChannel.unsubscribe()
		}
	})
</script>

<svelte:head>
	<title>Live Broadcasts - R5</title>
</svelte:head>

<header>
	<h1>Live Broadcasts</h1>
	<p>Real-time radio stations broadcasting now</p>

	<div class="debug">
		<span class:connected={subscriptionStatus === 'SUBSCRIBED'}>
			{subscriptionStatus === 'SUBSCRIBED' ? '🟢' : '🔴'}
			{subscriptionStatus}
		</span>
		{#if loadingError}
			<span>⚠️ {loadingError}</span>
		{/if}
		{#if appState.broadcasting_channel_id}
			<span>📡 Broadcasting</span>
		{/if}
		{#if appState.listening_to_channel_id}
			<span>🎧 Listening</span>
		{/if}
	</div>
	<BroadcastControls />
</header>

{#if activeBroadcasts.length === 0}
	<p>No live broadcasts right now</p>
{:else}
	<section class="list">
		{#each activeBroadcasts as broadcast (broadcast.channel_id)}
			{@const isListening = broadcast.channel_id === appState.listening_to_channel_id}
			{@const duration = timeAgo(broadcast.track_played_at)}
			<article>
				<header>
					<div class="channel-info">
						<ChannelAvatar id={broadcast.channels.image} alt={broadcast.channels.name} size={48} />
						<div>
							<h2><a href="/{broadcast.channels.slug}">@{broadcast.channels.slug}</a></h2>
							{#if broadcast.channels.name && broadcast.channels.name !== broadcast.channels.slug}
								<p>{broadcast.channels.name}</p>
							{/if}
						</div>
					</div>
					<div class="broadcast-meta">
						<span class="live">🔴 LIVE</span>
						<p>Broadcasting since {duration}</p>
					</div>
				</header>

				{@const track = tracks[broadcast.track_id]}
				{#if track}
					<h3>Now Playing</h3>
					<p><strong>{track.title || track.url}</strong></p>
					{#if track.description}
						<p>{track.description}</p>
					{/if}
				{/if}

				<button
					class:active={isListening}
					onclick={() => {
						if (isListening) {
							leaveBroadcast()
						} else {
							joinBroadcast(broadcast.channel_id)
						}
					}}
				>
					{isListening ? 'Leave Broadcast' : 'Join Broadcast'}
				</button>
			</article>
		{/each}
	</section>
{/if}

<style>
	article :global(img) {
		max-width: 200px;
	}
</style>
