<script>
	import TrackMeta from '$lib/components/track-meta.svelte'
	// import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	// import ButtonPlay from '$lib/components/button-play.svelte'
	// import ChannelCard from '$lib/components/channel-card.svelte'

	let {data} = $props()
	let {track, channel} = data
</script>

<article>
	<header>
		<p><a href="/{channel.slug}">@{channel.slug}</a> / {track.title}</p>
		<!-- <ChannelCard {channel} /> -->
		<!-- <ButtonPlay {channel} /> -->
	</header>
	<pre><code>{JSON.stringify(track, null, 2)}</code></pre>
	<p>{track.youtube_data?.title}</p>
	<hr />
	<TrackMeta {track} />
</article>

<style>
	article {
		margin: 0.5rem 0.5rem var(--player-compact-size);
	}
</style>
