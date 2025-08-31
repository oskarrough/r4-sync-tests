<script>
	import {onMount} from 'svelte'
	import {page} from '$app/state'
	import {relativeDate, relativeDateSolar} from '$lib/dates'
	import Icon from '$lib/components/icon.svelte'
	import ChannelHero from '$lib/components/channel-hero.svelte'
	import ButtonPlay from '$lib/components/button-play.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import LinkEntities from '$lib/components/link-entities.svelte'
	import ButtonFollow from '$lib/components/button-follow.svelte'
	import CoverFlip from '$lib/components/cover-flip.svelte'
	import {r5} from '$lib/r5'

	let {data} = $props()

	let channel = $state(data.channel)

	/** @type {import('$lib/types').Track[]} */
	let tracks = $state([])

	let latestTrackDate = $derived(tracks[0]?.created_at)

	/** @type {string[]} */
	let trackIds = $derived([])

	onMount(() => {
		data.tracksPromise.then((x) => {
			console.log('setting page tracks', x)
			tracks = x
		})

		// Update tracks if they are outdated.
		if (channel.tracks_synced_at) {
			r5.channels.outdated(data.slug).then((isOutdated) => {
				if (!isOutdated) return
				console.log('[page.svelte] refreshing outdated tracks')
				r5.tracks.pull({slug: data.slug}).then((freshTracks) => {
					tracks = freshTracks
				})
			})
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
			<menu>
				<ButtonPlay {channel} class="primary" />
				<ButtonFollow {channel} class="follow" />
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
		</header>

		<section>
			{#await data.tracksPromise}
				<p style="margin-top:1rem; margin-left: 0.5rem;">Loading tracks…</p>
			{:then whatevs}
				{@const ids = trackIds.length ? trackIds : whatevs.map((x) => x.id)}
				{#if ids.length > 0}
					<!-- <CoverFlip tracks={whatevs} /> -->
					<Tracklist {ids} grouped={1} />
				{:else}
					<p>No tracks</p>
				{/if}
			{:catch error}
				<p>error loading tracks: {error.message}</p>
			{/await}
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
		}
	}

	article header :global(figure) {
		margin: 0;
		min-width: 150px;

		@media (min-width: 520px) {
			margin: 0.5rem 1rem 0rem 0.5rem;
			float: left;
			max-width: 250px;
		}
	}

	section {
		clear: both;
	}

	h1,
	h1 ~ p {
		margin: 0 1.5rem;
	}

	h1 {
		display: flex;
		padding-top: 1rem;
		font-size: var(--font-9);
		gap: 0.5rem;
		align-items: center;
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
