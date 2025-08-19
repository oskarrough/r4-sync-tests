<script>
	import {page} from '$app/state'
	import {invalidate} from '$app/navigation'
	import TrackMeta from '$lib/components/track-meta.svelte'
	// import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	// import ButtonPlay from '$lib/components/button-play.svelte'
	// import ChannelCard from '$lib/components/channel-card.svelte'

	let {data} = $props()
	const track = $derived(data.track)
	const channel = $derived(data.channel)
	const activeTab = $derived(page.url.searchParams.get('tab') || 'r5')

	/* Since we use JSON.stringify to render, we dont want the default tab to
	include all the meta data */
	const trackWithoutMeta = $derived.by(() => {
		const t = {...track}
		delete t.youtube_data
		delete t.musicbrainz_data
		delete t.discogs_data
		return t
	})

	async function updateTrackMeta(meta) {
		console.log('Metadata updated:', meta)
		// Re-run the load function to get fresh data
		await invalidate('track-meta')
	}
</script>

<svelte:head>
	<title>{track?.title || 'Track'} by {channel?.name || 'Channel'} - R5</title>
</svelte:head>

<article>
	<header>
		<p><a href="/{channel.slug}">@{channel.slug}</a> / {track.title}</p>
		<menu class="tree">
			<a href="?tab=r5" class:active={activeTab === 'r5' || !activeTab}>r5</a>
			<a href="?tab=youtube" class:active={activeTab === 'youtube'}>youtube</a>
			<a href="?tab=musicbrainz" class:active={activeTab === 'musicbrainz'}>musicbrainz</a>
			<a href="?tab=discogs" class:active={activeTab === 'discogs'}>discogs</a>
		</menu>
		<!-- <ChannelCard {channel} /> -->
		<!-- <ButtonPlay {channel} /> -->
	</header>

	{#if activeTab === 'youtube'}
		{#if track.youtube_data}
			<pre><code>{JSON.stringify(track.youtube_data, null, 2)}</code></pre>
		{:else}
			<p>No YouTube data available</p>
		{/if}
	{:else if activeTab === 'musicbrainz'}
		{#if track.musicbrainz_data}
			<pre><code>{JSON.stringify(track.musicbrainz_data, null, 2)}</code></pre>
		{:else}
			<p>No MusicBrainz data available</p>
		{/if}
	{:else if activeTab === 'discogs'}
		{#if track.discogs_data}
			<pre><code>{JSON.stringify(track.discogs_data, null, 2)}</code></pre>
		{:else}
			<p>No Discogs data available</p>
		{/if}
	{:else}
		<pre><code>{JSON.stringify(trackWithoutMeta, null, 2)}</code></pre>
	{/if}

	<hr />
	<TrackMeta {track} onResult={updateTrackMeta} />
</article>

<style>
	article {
		margin: 0.5rem 0.5rem var(--player-compact-size);
	}

	.tree {
		margin-left: 2rem;
		display: inline-flex;
		flex-flow: column;
		line-height: 1;

		a {
			text-decoration: none;

			&::before {
				font-family: var(--monospace);
				content: '├──';
				display: inline;
			}

			&.active {
				background: var(--color-accent);
				color: var(--gray-1);

				&::before {
					background: var(--bg-1);
					color: var(--gray-12);
				}
			}
		}
	}
</style>
