<script>
	import {page} from '$app/state'
	import {useLiveQuery} from '@tanstack/svelte-db'
	import {addToPlaylist, playTrack, setPlaylist} from '$lib/api'
	import ChannelCard from '$lib/components/channel-card.svelte'
	import SearchStatus from '$lib/components/search-status.svelte'
	import TrackCard from '$lib/components/track-card.svelte'
	import {trap} from '$lib/focus'
	import {r5} from '$lib/r5'
	import {channelsCollection} from '../tanstack/collections'
	import * as m from '$lib/paraglide/messages'

	// Trigger channels to load into collection state (needed for search on direct page load)
	const channelsQuery = useLiveQuery((q) => q.from({channels: channelsCollection}))

	/** @type {import('$lib/types.ts').Channel[]} */
	let channels = $state([])

	/** @type {import('$lib/types.ts').Track[]} */
	let tracks = $state([])

	let searchQuery = $state('')
	let isLoading = $state(false)

	// Watch for URL changes and update search (wait for channels to load)
	$effect(() => {
		const urlSearch = page.url.searchParams.get('search')
		if (channelsQuery.isLoading) return
		if (urlSearch && urlSearch !== searchQuery) {
			searchQuery = urlSearch
			search()
		} else if (!urlSearch && searchQuery) {
			searchQuery = ''
			clear()
		}
	})

	function clear() {
		channels = []
		tracks = []
	}

	async function search() {
		if (searchQuery.trim().length < 2) return clear()

		isLoading = true
		const results = await r5.search.all(searchQuery)
		channels = results.channels
		tracks = results.tracks
		isLoading = false
	}

	async function playSearchResults() {
		const ids = tracks.map((t) => t.id)
		await setPlaylist(ids)
		await playTrack(ids[0], null, 'play_search')
	}
</script>

<svelte:head>
	<title>{m.search_title()}</title>
</svelte:head>

<article use:trap>
	<menu>
		{#if searchQuery && !isLoading && tracks.length > 0}
			<button type="button" onclick={playSearchResults}>{m.search_play_all()}</button>
			<button type="button" onclick={() => addToPlaylist(tracks.map((t) => t.id))}>{m.search_queue_all()}</button>
		{/if}
		<SearchStatus {searchQuery} channelCount={channels.length} trackCount={tracks.length} />
	</menu>

	{#if searchQuery && !isLoading}
		{#if channels.length === 0 && tracks.length === 0}
			<p>{m.search_no_results()} "{searchQuery}"</p>
			<p>{m.search_tip_slug()}</p>
		{/if}

		{#if channels.length > 0}
			<section>
				<h2 style="margin-left:0.5rem">
					{channels.length === 1
						? m.search_channel_one({count: channels.length})
						: m.search_channel_other({count: channels.length})}
				</h2>
				<ul class="grid">
					{#each channels as channel (channel.id)}
						<li>
							<ChannelCard {channel} />
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if tracks.length > 0}
			<section>
				<h2>
					{tracks.length === 1
						? m.search_track_one({count: tracks.length})
						: m.search_track_other({count: tracks.length})}
				</h2>
				<ul class="list">
					{#each tracks as track, index (track.id)}
						<li>
							<TrackCard {track} {index} showSlug={true} />
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{:else if !searchQuery}
		<p>
			{m.search_tip_intro()}
			<br />
			{m.search_tip_header()}
			<br /> <code>{m.search_tip_code_channel()}</code>
			{m.search_tip_channel()}
			<br /> <code>{m.search_tip_code_channel_query()}</code>
			{m.search_tip_channel_query()}
			<br /> <code>/</code>
			{m.search_tip_commands()}
		</p>
	{/if}
</article>

<style>
	article > p {
		margin-left: 0.5rem;
		margin-right: 0.5rem;
	}

	menu {
		margin: 0.5rem 0.5rem 2rem;
		align-items: center;
	}

	menu,
	section {
		margin-bottom: 2rem;
	}

	.grid :global(article h3 + p) {
		display: none;
	}
</style>
