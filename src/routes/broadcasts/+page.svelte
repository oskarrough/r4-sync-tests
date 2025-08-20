<script>
	import {sdk} from '@radio4000/sdk'
	import {joinBroadcast, leaveBroadcast} from '$lib/broadcast'
	import {r4} from '$lib/r4'
	import {appState} from '$lib/app-state.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import BroadcastControls from '$lib/components/broadcast-controls.svelte'
	import {logger} from '$lib/logger'

	const log = logger.ns('broadcasts-page').seal()

	/** @type {import('$lib/types').BroadcastWithChannel[]} */
	let activeBroadcasts = $state([])
	let subscriptionStatus = $state('disconnected')
	let loadingError = $state(null)

	function formatDuration(trackPlayedAt) {
		const now = Date.now()
		const startTime = new Date(trackPlayedAt).getTime()
		const durationMs = now - startTime

		if (durationMs < 60000) return 'just started'
		if (durationMs < 3600000) return `${Math.floor(durationMs / 60000)}m ago`

		const hours = Math.floor(durationMs / 3600000)
		const minutes = Math.floor((durationMs % 3600000) / 60000)
		return `${hours}h ${minutes}m ago`
	}

	async function loadBroadcasts() {
		try {
			loadingError = null
			const data = await r4.broadcasts.readBroadcastsWithChannel()
			const previousCount = activeBroadcasts.length
			activeBroadcasts = data

			// Update user's local broadcast state based on remote reality
			const userChannelId = appState.channels?.[0]
			if (userChannelId) {
				const userBroadcast = data.find((b) => b.channel_id === userChannelId)
				const wasLocallyBroadcasting = !!appState.broadcasting_channel_id
				const isRemotelyBroadcasting = !!userBroadcast

				if (isRemotelyBroadcasting && !wasLocallyBroadcasting) {
					log.log('detected_user_broadcast_started_remotely', {userChannelId})
					appState.broadcasting_channel_id = userChannelId
				} else if (!isRemotelyBroadcasting && wasLocallyBroadcasting) {
					log.log('detected_user_broadcast_stopped_remotely', {userChannelId})
					appState.broadcasting_channel_id = null
				}
			}

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
			{@const duration = formatDuration(broadcast.track_played_at)}
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

				{#if broadcast.tracks}
					<h3>Now Playing</h3>
					<p><strong>{broadcast.tracks.title || broadcast.tracks.url}</strong></p>
					{#if broadcast.tracks.body}
						<p>{broadcast.tracks.body}</p>
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
