<script>
	import {joinBroadcast, leaveBroadcast, watchBroadcasts} from '$lib/broadcast'
	import {appState} from '$lib/app-state.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import BroadcastControls from '$lib/components/broadcast-controls.svelte'
	import LiveBroadcasts from '$lib/components/live-broadcasts.svelte'
	import {timeAgo} from '$lib/utils'

	const broadcastState = $state({
		broadcasts: [],
		error: null
	})

	const activeBroadcasts = $derived(broadcastState.broadcasts)
	const loadingError = $derived(broadcastState.error)

	const unsubscribe = watchBroadcasts((data) => {
		broadcastState.broadcasts = data.broadcasts
		broadcastState.error = data.error
	})

	$effect(() => {
		return unsubscribe
	})
</script>

<svelte:head>
	<title>Live Broadcasts - R5</title>
</svelte:head>

<header>
	<h1>Live Broadcasts</h1>
	<p>
		Work in progress. Here yoy can listen to broadcasts from other radios. Listen to what they're
		listening to.
	</p>
	<br />
	<div class="debug">
		{#if loadingError}
			<p>⚠️ {loadingError}</p>
		{/if}
		{#if appState.broadcasting_channel_id}
			<p>📡 You are broadcasting</p>
		{/if}
		{#if appState.listening_to_channel_id}
			<p>You are listening to a broadcast</p>
		{/if}
	</div>
	<BroadcastControls />
</header>

<LiveBroadcasts broadcasts={activeBroadcasts} />

<section class="list">
	{#each activeBroadcasts as broadcast (broadcast.channel_id)}
		{@const isListening = broadcast.channel_id === appState.listening_to_channel_id}
		{@const duration = timeAgo(broadcast.track_played_at)}
		<article>
			<div>
				<div class="channel-info">
					<ChannelAvatar id={broadcast.channels.image} alt={broadcast.channels.name} />
					<div>
						<h2><a href="/{broadcast.channels.slug}">@{broadcast.channels.slug}</a></h2>
						<p>{broadcast.channels.name}</p>
					</div>
				</div>
				<p>Broadcasting since {duration}</p>
			</div>
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
				{isListening ? 'Leave broadcast' : 'Join broadcast'}
			</button>
		</article>
	{:else}
		<p>No live broadcasts right now</p>
	{/each}
</section>

<style>
	article :global(img) {
		max-width: 200px;
	}

	header,
	section {
		margin: 0.5rem;
	}
</style>
