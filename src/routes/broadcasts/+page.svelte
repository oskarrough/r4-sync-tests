<script>
	import {joinBroadcast, leaveBroadcast, watchBroadcasts} from '$lib/broadcast'
	import {appState} from '$lib/app-state.svelte'
	import BroadcastControls from '$lib/components/broadcast-controls.svelte'
	import EnsureTrack from '$lib/components/ensure-track.svelte'
	import {timeAgo} from '$lib/utils'
	import ChannelCard from '$lib/components/channel-card.svelte'

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
	<p>Work in progress. Here yoy can listen to broadcasts from other radios. Listen to what they're listening to.</p>

	{#if loadingError}
		<p>Error! {loadingError}</p>
	{/if}

	<menu>
		<BroadcastControls />
	</menu>
</header>

<section class="list">
	{#each activeBroadcasts as broadcast (broadcast.channel_id)}
		{@const joined = broadcast.channel_id === appState.listening_to_channel_id}
		<div class:active={joined}>
			<!-- <div class="live-dot"></div> -->
			<ChannelCard channel={broadcast.channels}>
				<p>
					Broadcasting since {timeAgo(broadcast.track_played_at)}
					<em>
						<EnsureTrack tid={broadcast.track_id}>I AM INSIDE</EnsureTrack>
					</em>
				</p>

				<button
					type="button"
					onclick={(e) => {
						e.preventDefault()
						if (joined) {
							leaveBroadcast()
						} else {
							joinBroadcast(broadcast.channel_id)
						}
					}}
				>
					{joined ? 'Leave broadcast' : 'Join broadcast'}
				</button>
			</ChannelCard>
		</div>
	{:else}
		<p>No live broadcasts right now</p>
	{/each}
</section>

<style>
	header,
	section {
		margin: 0.5rem;
	}

	header > menu {
		margin: 1rem;
	}

	.list :global(article > a) {
		grid-template-columns: 8rem auto;
		gap: 1rem;
	}
</style>
