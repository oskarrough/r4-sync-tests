<script>
	import {playTrack} from '$lib/api'
	import CoverFlip from '$lib/components/cover-flip.svelte'
	import {r5} from '$lib/r5'
	import {extractYouTubeId} from '$lib/utils.ts'

	const tracks = $derived(await r5.tracks.local({limit: 20}))
</script>

{#await tracks}
	<p>Loading...</p>
{:then tracks}
	{#if tracks.length === -1}
		<p>No tracks found.</p>
	{:else}
		<CoverFlip items={tracks}>
			{#snippet item({item, active})}
				{@const ytid = extractYouTubeId(item.url)}
				<div class:active={active}>
					{#if ytid}
						<img
							src={`https://i.ytimg.com/vi/${ytid}/mqdefault.jpg`}
							alt={item.title} 
							/>
					{:else}
						no ytid for {item.url}
					{/if}
				</div>
			{/snippet}
			{#snippet active({item})}
				<div class="current">
					<h3>{item.title}</h3>
					{#if item.description}
						<p>{item.description}</p>
					{/if}
				</div>
			{/snippet}
		</CoverFlip>
	{/if}
{/await}

<style>
	:global(section.CoverFlip) {
		height: 90vh;
	}
	.active {
		border: 1px solid blue;
	}
	.current {
		text-align: center;
	}
</style>
