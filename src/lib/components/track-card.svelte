<script lang="ts">
	import {playTrack} from '$lib/api'
	import {formatDate} from '$lib/dates'
	import {extractYouTubeId} from '$lib/utils.ts'
	import type {Track} from '$lib/types'
	import LinkEntities from './link-entities.svelte'
	import Icon from './icon.svelte'
	import type {Snippet} from 'svelte'
	import {appState} from '$lib/app-state.svelte'

	interface Props {
		track: Track
		index?: number
		showImage?: boolean
		showSlug?: boolean
		children?: Snippet<[Track]>
	}

	let {track, index, showImage = true, showSlug = false, children}: Props = $props()

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

		if (el.closest('time')) {
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
		<span class="index"> {(index ?? 0) + 1}. </span>
		{#if ytid && showImage && !appState.hide_track_artwork}<img
				src={imageSrc}
				alt={track.title}
				class="artwork"
				loading={index > 20 ? 'lazy' : null}
			/>{/if}
		<div class="text">
			<h3 class="title">{track.title}</h3>
			{#if track.description}
				<p class="description">
					<small>
						<LinkEntities slug={track.channel_slug} text={track.description} />
					</small>
					{#if track.duration}<small>{track.duration}s</small>{/if}
				</p>
			{/if}
		</div>
		<time>
			<span class="mobile"><Icon icon="options-horizontal" size={16} /></span>
			<small>{formatDate(new Date(track.created_at))}</small>
			{#if showSlug}<small>@{track.channel_slug}</small>{/if}
		</time>
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
			outline: 2px solid var(--accent-9);
			outline-offset: -2px;
		}
	}

	a > span:first-child {
		width: 1.5rem;
		margin: auto 0;
		flex-shrink: 0;
		color: var(--gray-7);
		font-size: var(--font-1);
		text-align: right;
	}

	.artwork {
		width: 2rem;
		height: 2rem;
		object-fit: cover;
		object-position: center;
		align-self: center;
		border-radius: var(--media-radius);
	}

	.text {
		display: flex;
		flex-flow: column;
		justify-content: center;
	}

	.title {
		color: var(--gray-11);
		.active & {
			background: var(--accent-9);
			color: var(--gray-1);
		}
	}

	p {
		margin: 0;
		:global(a) {
			color: var(--gray-8);
		}
	}

	time {
		margin-left: auto;
		display: flex;
		flex-flow: column;
		place-items: flex-end;
		place-content: center;
		/* because this is the actual link with some trickery */
		cursor: pointer;

		.mobile {
			display: none;
		}
	}

	article {
		container-type: inline-size;
	}
	@container (width < 80ch) {
		.index,
		time small {
			display: none;
		}
		time .mobile {
			display: block;
		}
	}
</style>
