<script lang="ts">
	import {playTrack} from '$lib/api'
	import {formatDate} from '$lib/dates'
	import {extractYouTubeId} from '$lib/utils'
	import type {Track} from '$lib/types'
	import LinkEntities from './link-entities.svelte'
	import type {Snippet} from 'svelte'
	import {appState} from '$lib/app-state.svelte'

	interface Props {
		track: Track
		index: number
		showImage?: boolean
		children?: Snippet<[Track]>
	}

	let {track, index, showImage = true, children}: Props = $props()

	const permalink = $derived(`/${track.channel_slug}/tracks/${track.id}`)
	const active = $derived(track.id === appState.playlist_track)
	const ytid = $derived.by(() => extractYouTubeId(track.url))
	// default, mqdefault, hqdefault, sddefault, maxresdefault
	const imageSrc = $derived(`https://i.ytimg.com/vi/${ytid}/mqdefault.jpg`)

	const click = (event: MouseEvent) => {
		const el = event.target as HTMLElement

		if (el instanceof HTMLAnchorElement && el.href.includes('search=')) {
			// Let hashtag/mention links through
			return
		}

		if (el.parentNode instanceof HTMLTimeElement) {
			// Let time element links through
			return
		}

		event.preventDefault()
		playTrack(track.id, '', 'user_click_track')
	}
	const doubleClick = () => playTrack(track.id, '', 'user_click_track')
</script>

<article class:active>
	<a href={permalink} onclick={click} ondblclick={doubleClick} data-sveltekit-preload-data="tap">
		<span class="index">{index + 1}.</span>
		{#if ytid && showImage}<img src={imageSrc} alt={track.title} class="artwork" />{/if}
		<div>
			<h3 class="title">{track.title}</h3>
			<p class="description">
				<small>
					<LinkEntities {track} text={track.description} />
				</small>
				{#if track.duration}<small>{track.duration}s</small>{/if}
			</p>
		</div>
		<time>
			{#if track.channel_slug}<small class="slug">@{track.channel_slug}</small>{/if}
			<small>{formatDate(new Date(track.created_at))}</small></time
		>
	</a>
	{@render children?.({track})}
</article>

<style>
	a {
		display: flex;
		flex-flow: row nowrap;
		gap: 0 0.5rem;
		padding: 0.5rem 0.5rem 0.5rem 0.5rem;
		line-height: 1.2;
		text-decoration: none;
		cursor: default;

		&:focus {
			outline: 3px solid var(--color-accent);
			outline-offset: -2px;
		}
	}

	a > span:first-child {
		width: 2rem;
		flex-shrink: 0;
		color: var(--gray-6);
		/* font-size: var(--font-1); */
		text-indent: 0.2em;
	}

	.artwork {
		width: 2rem;
		height: 2rem;
		object-fit: cover;
		object-position: center;
		align-self: center;
	}

	.title {
		.active & {
			background: var(--color-accent);
			color: var(--gray-1);
		}
	}

	p {
		margin: 0;
	}

	time {
		margin-left: auto;
		display: flex;
		flex-flow: column;
		place-items: flex-end;
		place-content: center;
		/* because this is the actual link with some trickery */
		cursor: pointer;
	}

	article {
		container-type: inline-size;
	}
	@container (width < 80ch) {
		.index,
		time,
		.slug {
			display: none;
		}
	}
</style>
