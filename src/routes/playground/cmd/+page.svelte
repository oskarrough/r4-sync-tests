<script lang="ts">
	import {trap} from '$lib/focus'

	let container: HTMLElement | null = $state(null)

	const mockResults = $state([
		{id: 1, type: 'channel', title: 'Radio Paradise', slug: 'radio-paradise'},
		{id: 2, type: 'track', title: 'Bohemian Rhapsody', channel: 'Queen Radio'},
		{id: 3, type: 'channel', title: 'Jazz FM', slug: 'jazz-fm'},
		{id: 4, type: 'track', title: 'Blue Train', channel: 'Jazz Classics'},
		{id: 5, type: 'track', title: 'Take Five', channel: 'Jazz Classics'}
	])

	function handleResultClick(result) {
		console.log('result clicked:', result)
	}
</script>

<svelte:head>
	<title>Command Terminal - R5</title>
</svelte:head>

<div bind:this={container} use:trap>
	<input type="search" placeholder="Search..." />

	<ul class="list">
		{#each mockResults as result (result.id)}
			<li>
				<a
					href={`#${result.id}`}
					onclick={(e) => {
						e.preventDefault()
						handleResultClick(result)
					}}
				>
					<strong>{result.title}</strong>
					{#if result.type === 'track'}
						<small>from {result.channel}</small>
					{:else}
						<small>@{result.slug}</small>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	a:focus {
		outline: 2px solid var(--blue-6);
		outline-offset: -2px;
		background: blue;
	}

	input:focus {
		outline: 2px solid var(--blue-6);
		outline-offset: -2px;
	}
</style>
