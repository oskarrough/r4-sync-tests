<script>
	import {onMount} from 'svelte'
	import ButtonFollow from '$lib/components/button-follow.svelte'
	import ButtonPlay from '$lib/components/button-play.svelte'
	import ChannelHero from '$lib/components/channel-hero.svelte'
	import Icon from '$lib/components/icon.svelte'
	import LinkEntities from '$lib/components/link-entities.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import {relativeDate, relativeDateSolar} from '$lib/dates'
	import {r5} from '$lib/r5'

	let {data} = $props()

	let channel = $state(data.channel)

	/** @type {import('$lib/types').Track[]} */
	let tracks = $state([])

	let latestTrackDate = $derived(tracks[0]?.created_at)

	/** @type {string[]} */
	let trackIds = $derived([])

	onMount(async () => {
		// Load tracks after page render
		const loadTracks = !channel.tracks_synced_at
			? r5.tracks.pull({slug: data.slug})
			: r5.tracks.local({slug: data.slug, fast: true})

		tracks = await loadTracks

		// Update tracks if they are outdated.
		if (channel.tracks_synced_at) {
			const isOutdated = await r5.channels.outdated(data.slug)
			if (isOutdated) {
				console.log('[page.svelte] refreshing outdated tracks')
				tracks = await r5.tracks.pull({slug: data.slug})
			}
		}
	})
</script>

<svelte:head>
	<title>{channel?.name || 'Channel'} - R5</title>
</svelte:head>

{#if channel}
	<article>
		<header>
			<ChannelHero {channel} />
			<div>
				<menu>
					<ButtonPlay {channel} class="primary" />
					<ButtonFollow {channel} class="follow" />
					<a href="/{channel.slug}/tags" class="btn">Tags</a>
				</menu>
				<h1>
					{channel.name}

					{#if channel.longitude && channel.latitude}
						<a
							href={`/?display=map&slug=${channel.slug}&longitude=${channel.longitude}&latitude=${channel.latitude}&zoom=15`}
						>
							<Icon icon="map" />
						</a>
					{/if}
				</h1>
				<p><LinkEntities slug={channel.slug} text={channel.description} /></p>
				{#if channel.url}
					<p><a href={channel.url} target="_blank" rel="noopener">{channel.url}</a></p>
				{/if}
				<p>
					<small>
						Broadcasting since {relativeDateSolar(channel.created_at)}. Updated {relativeDate(
							latestTrackDate || channel.updated_at
						)}. {channel.track_count} tracks
					</small>
				</p>
			</div>
		</header>

		<section>
			{#if tracks.length > 0}
				<!-- <CoverFlip tracks={tracks} /> -->
				<Tracklist {tracks} grouped={1} />
			{:else}
				<p style="margin-top:1rem; margin-left: 0.5rem;">Loading tracks…</p>
			{/if}
		</section>
	</article>
{:else}
	<p>No channel</p>
{/if}

<style>
	article {
		margin-bottom: var(--player-compact-size);
	}

	header {
		overflow: hidden;
		margin-bottom: 1rem;

		menu {
			margin-top: 0.5rem;

			@media (min-width: 520px) {
				justify-content: flex-start;
			}
		}

		@media (min-width: 520px) {
			display: grid;
			grid-template-columns: 250px 1fr;
			> *:not(figure) {
				grid-column: 2;
			}
		}
	}

	article header :global(figure) {
		margin: 0.5rem auto 0;
		min-width: 150px;
		max-width: 300px;

		@media (min-width: 520px) {
			margin: 0.5rem 1rem 0rem 0.5rem;
			max-width: 250px;
		}
	}

	section {
		clear: both;
	}

	h1,
	h1 ~ p {
		margin: 0 1.5rem;
		text-align: center;

		@media (min-width: 520px) {
			text-align: left;
			margin: 0;
		}
	}

	h1 {
		display: flex;
		padding-top: 1rem;
		font-size: var(--font-9);
		gap: 0.5rem;
		align-items: center;
		place-content: center;

		@media (min-width: 520px) {
			place-content: flex-start;
		}
	}

	h1 + p {
		font-size: var(--font-7);
		line-height: 1.3;
		/* max-width: 80ch; */
	}

	small {
		font-size: var(--font-5);
	}
</style>
