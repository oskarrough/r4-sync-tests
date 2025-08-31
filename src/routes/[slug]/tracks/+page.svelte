<script>
	import {page} from '$app/state'
	import {playTrack} from '$lib/api'
	import CoverFlip from '$lib/components/cover-flip.svelte'
	import {r5} from '$lib/r5'
	import {extractYouTubeId} from '$lib/utils.ts'

	let tracks = $derived(r5.tracks.local({slug: page.params.slug, limit: 100}))
</script>

{#await tracks}
	<p>Loading...</p>
{:then tracks}
	{#if tracks.length === -1}
		<p>No tracks found.</p>
	{:else}
		<CoverFlip items={tracks} scrollItemsPerNotch={1}>
			{#snippet item({item, active})}
				{@const ytid = extractYouTubeId(item.url)}
				<button class="item" class:active onclick={() => playTrack(item.id, null, 'user_click_track')}>
					{#if ytid}
						<img src={`https://i.ytimg.com/vi/${ytid}/mqdefault.jpg`} alt={item.title} />
					{:else}
						no ytid for {item.url}
					{/if}
				</button>
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
		width: 100%;
		height: 100vh;
		align-items: flex-start;
		background: var(--test-black);
		padding-left: 10vw;
	}

	.item {
		all: unset;
		width: 25vw;
		height: 100%;
		img {
			height: 100%;
			object-fit: cover;
		}
	}

	.item::after {
		opacity: 0;
		transform: scale(0.9);
		content: '';
		position: absolute;
		width: 1rem;
		height: 1rem;
		background: var(--test-yellow);
		top: 0;
		right: -1rem;
		transition: all 200ms;
	}

	.item.active {
		&::after {
			opacity: 1;
			transform: scale(1);
		}
	}

	.current {
		background: var(--test-fl-blue);
		color: var(--test-fl-cyan);
		position: fixed;
		top: 50%;
		left: 35vw;
		z-index: 1;
		h3,
		p {
			font-size: var(--font-9);
			padding: 0 0.2em;
		}
		h3 {
			font-weight: bold;
		}
		p {
			background: var(--test-fl-cyan);
			color: var(--test-fl-blue);
		}
	}
</style>
