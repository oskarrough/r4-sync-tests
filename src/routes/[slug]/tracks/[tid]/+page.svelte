<script>
	import {page} from '$app/state'
	import {invalidate} from '$app/navigation'
	import TrackMeta from '$lib/components/track-meta.svelte'
	import TrackMetaR5 from '$lib/components/track-meta-r5.svelte'
	import TrackMetaYoutube from '$lib/components/track-meta-youtube.svelte'
	import TrackMetaMusicbrainz from '$lib/components/track-meta-musicbrainz.svelte'
	import TrackMetaDiscogs from '$lib/components/track-meta-discogs.svelte'
	import TrackRelated from '$lib/components/track-related.svelte'
	import TrackCard from '$lib/components/track-card.svelte'
	// import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	// import ButtonPlay from '$lib/components/button-play.svelte'
	// import ChannelCard from '$lib/components/channel-card.svelte'

	let {data} = $props()
	const track = $derived(data.track)
	const channel = $derived(data.channel)
	const activeTab = $derived(page.url.searchParams.get('tab') || 'r5')

	async function updateTrackMeta(meta) {
		console.log('Metadata updated:', meta)
		// Re-run the load function to get fresh data
		await invalidate('track:meta')
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
			<a href="?tab=related" class:active={activeTab === 'related'}>related</a>
		</menu>
		<!-- <ChannelCard {channel} /> -->
		<!-- <ButtonPlay {channel} /> -->
	</header>

	{#if activeTab === 'youtube'}
		<TrackMetaYoutube data={track.youtube_data} {track} />
	{:else if activeTab === 'musicbrainz'}
		<TrackMetaMusicbrainz data={track.musicbrainz_data} {track} />
	{:else if activeTab === 'discogs'}
		<TrackMetaDiscogs data={track.discogs_data} {track} />
	{:else if activeTab === 'related'}
		<TrackRelated {track} />
	{:else}
		<TrackCard {track} />
		<TrackMetaR5 data={track} />
	{/if}

	<hr />
	<TrackMeta {track} onResult={updateTrackMeta} />
</article>

<style>
	article {
		margin: 0.5rem 0.5rem var(--player-compact-size);
	}

	pre {
		font-size: var(--font-3);
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
