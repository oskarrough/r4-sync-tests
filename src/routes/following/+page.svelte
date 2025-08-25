<script>
	import {appState} from '$lib/app-state.svelte'
	import ChannelCard from '$lib/components/channel-card.svelte'

	/** @type {import('./$types').PageData} */
	let {data} = $props()

	let followings = $derived(data.followings)
	let syncedChannels = $derived(followings?.filter((c) => !c.firebase_id) || [])
	let localChannels = $derived(followings?.filter((c) => c.firebase_id) || [])
</script>

<svelte:head>
	<title>Following - R5</title>
</svelte:head>

<article>
	<header>
		<h1>Following</h1>
		<p>
			{followings?.length || 0} channels
			{#if !appState.channels?.length}
				· <a href="/auth?redirect=/following">sign in to sync your followers with R4</a>
			{/if}
		</p>
	</header>

	{#if followings?.length === 0}
		<p>Channels you follow will appear here.</p>
	{:else}
		{#if syncedChannels.length > 0}
			<div class="grid">
				{#each syncedChannels as following (following.id)}
					<ChannelCard channel={following} />
				{/each}
			</div>
		{/if}

		{#if localChannels.length > 0}
			<h2>Local favorites</h2>
			<p>These v1 channels are saved locally on your device, but can't be pushed to R4.</p>
			<div class="grid">
				{#each localChannels as following (following.id)}
					<ChannelCard channel={following} />
				{/each}
			</div>
		{/if}
	{/if}
</article>

<style>
	article {
		margin: 0.5rem 0.5rem var(--player-compact-size);
	}

	header p {
		margin: 0;
	}

	.grid {
	}

	.local-channels {
	}
</style>
