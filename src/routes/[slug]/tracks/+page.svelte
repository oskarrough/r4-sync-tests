<script>
	import {page} from '$app/state'
	import {playTrack} from '$lib/api'
	import CoverFlip from '$lib/components/cover-flip.svelte'
	import {r5} from '$lib/r5'
	import {extractYouTubeId} from '$lib/utils.ts'
	import * as m from '$lib/paraglide/messages'

	let tracks = $derived(r5.tracks.local({slug: page.params.slug, limit: 100}))
</script>

<div class="page">
	{#await tracks}
		<p>{m.common_loading()}</p>
	{:then tracks}
		{#if tracks.length === 0}
			<p>{m.tracks_no_results()}</p>
		{:else}
			<CoverFlip items={tracks} scrollItemsPerNotch={1}>
				{#snippet item({item, active})}
					{@const ytid = extractYouTubeId(item.url)}
					<button class="item" class:active onclick={() => playTrack(item.id, null, 'user_click_track')}>
						{#if ytid}
							<img src={`https://i.ytimg.com/vi/${ytid}/mqdefault.jpg`} alt={item.title} />
						{:else}
							{m.tracks_no_ytid({url: item.url})}
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
</div>

<style>
	.page {
		position: fixed;
		width: 100%;
		height: 100%;
		background: var(--test-black);
		padding-left: 10vw;

		:global(section.CoverFlip) {
			align-items: flex-start;
			width: 100%;
			height: 100%;
		}
	}

	.item {
		all: unset;
		width: 20vw;
		height: 100%;

		img {
			aspect-ratio: 320 / 180;
		}
	}

	.item::after {
		opacity: 0;
		transform: scale(0.9);
		content: '';
		position: absolute;
		width: 1rem;
		height: 100%;
		background: var(--test-fl-orange);
		top: 0;
		right: -1rem;
		transition: all 150ms;
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

		background: var(--test-fl-orange);
		color: var(--test-fl-yellow);

		position: fixed;
		bottom: 50%;
		left: calc(30vw + 1rem);
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
