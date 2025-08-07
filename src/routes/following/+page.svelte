<script>
	import {appState} from '$lib/app-state.svelte'
	import ChannelCard from '$lib/components/channel-card.svelte'

	/** @type {import('./$types').PageData} */
	let {data} = $props()

	let followings = $derived(data.followings)
</script>

<svelte:head>
	<title>Following - R5</title>
</svelte:head>

<header>
	<h1>Following</h1>
	<p>
		{followings?.length || 0} channels
		{#if !appState.channels?.length}
			· <a href="/login?redirect=/following">sign in to sync your followers with R4</a>
		{/if}
	</p>
</header>

{#if followings?.length === 0}
	<p style="margin-left: 0.5rem;">Channels you follow will appear here.</p>
{:else}
	<div class="grid">
		{#each followings as following (following.id)}
			<ChannelCard channel={following} />
		{/each}
	</div>
{/if}

<style>
	header {
		margin: 0.5rem 0.5rem 2rem;
	}

	header p {
		margin: 0;
	}

	.grid {
		margin-bottom: var(--player-compact-size);
	}
</style>
