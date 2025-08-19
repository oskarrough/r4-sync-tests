<script>
	import {trimWithEllipsis} from '$lib/utils.ts'
	import ChannelHero from './channel-hero.svelte'

	/** @type {{channel: import('$lib/types').Channel}}*/
	let {channel} = $props()

	/** @param {MouseEvent} event */
	async function doubleclick({currentTarget}) {
		if (currentTarget instanceof HTMLElement) {
			currentTarget.querySelector('button')?.click()
		}
	}
</script>

<article ondblclick={doubleclick}>
	<a href={`/${channel.slug}`}>
		<ChannelHero {channel} />
		<div>
			<h3>
				{channel.name}
				{#if channel.broadcasting}
					<span class="live-indicator">🔴 LIVE</span>
				{/if}
			</h3>
			<p class="desc">
				{trimWithEllipsis(channel.description)}
				{#if channel.track_count}
					<small>({channel.track_count})</small>
				{/if}
			</p>
		</div>
	</a>
</article>

<style>
	article {
		position: relative;
	}

	article > a {
		display: flex;
		flex-flow: column nowrap;
		gap: 0.5rem;
		text-decoration: none;

		:global(.list) & {
			display: grid;
			grid-template-columns: 4rem auto;
			align-items: center;
			padding: 0.2rem 0.5rem;
		}

		:global(.grid) & {
			display: flex;
			flex-flow: column nowrap;
		}

		h3 {
			text-decoration-line: underline;
			text-decoration-thickness: 0.1px;
			text-decoration-color: var(--gray-10);
			text-underline-offset: max(0.1em, 2px);
		}
	}

	article > a:hover h3 {
		color: var(--color-accent);
	}

	article > a:focus,
	article :global(button):focus {
		outline: 3px solid var(--color-accent);
		outline-offset: -2px;
	}

	article :global(figure) {
		max-width: 50vw;
		aspect-ratio: 1/1;
		background: var(--gray-2);
		width: 100%;
		border-radius: var(--border-radius);
		/* for channels with no image */
		min-height: 2rem;
	}

	h3 {
		font-weight: normal;
	}
	h3,
	p {
		margin: 0;
		line-height: 1.2;
	}
	h3 + p {
		color: var(--gray-10);
	}

	.live-indicator {
		color: red;
		font-weight: bold;
		margin-left: 0.5rem;
	}
</style>
