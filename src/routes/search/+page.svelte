<script>
	import {trap} from '$lib/focus'
	import {page} from '$app/state'
	import {r5} from '$lib/r5'
	import {setPlaylist, addToPlaylist} from '$lib/api'
	import ChannelCard from '$lib/components/channel-card.svelte'
	import TrackCard from '$lib/components/track-card.svelte'

	/** @type {import('$lib/types.ts').Channel[]} */
	let channels = $state([])

	/** @type {import('$lib/types.ts').Track[]} */
	let tracks = $state([])

	let searchQuery = $state('')
	let isLoading = $state(false)

	// Watch for URL changes and update search
	$effect(() => {
		const urlSearch = page.url.searchParams.get('search')
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

		try {
			const results = await r5.search.all(searchQuery)
			channels = results.channels
			tracks = results.tracks
		} catch (error) {
			console.error('search:error', error)
		}

		isLoading = false
	}
</script>

<svelte:head>
	<title>Search - R5</title>
</svelte:head>

<article use:trap>
	<menu>
		{#if searchQuery && !isLoading && tracks.length > 0}
			<button type="button" onclick={() => setPlaylist(tracks.map((t) => t.id))}>Play all</button>
			<button type="button" onclick={() => addToPlaylist(tracks.map((t) => t.id))}>Add to queue</button>
		{/if}
		<small
			>Found {channels.length} channels and {tracks.length} tracks for
			<em>"{searchQuery}"</em></small
		>
	</menu>

	{#if searchQuery && !isLoading}
		{#if channels.length === 0 && tracks.length === 0}
			<p>No results found for "{searchQuery}"</p>
			<p>Tip: use @slug to find tracks in a channel</p>
		{/if}

		{#if channels.length > 0}
			<section>
				<h2 style="margin-left:0.5rem">{channels.length} Channels</h2>
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
				<h2>Tracks ({tracks.length})</h2>
				<ul class="list">
					{#each tracks as track, index (track.id)}
						<li>
							<TrackCard {track} {index} />
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{:else if !searchQuery}
		<p>
			TIP:
			<br /> Use the search input in the header
			<br /> <code>@channel</code> to search channels
			<br /> <code>@channel query</code> to search tracks within a channel
			<br /><code>/</code> for commands
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
		small {
			margin-right: 0.5rem;
		}
	}

	menu,
	section {
		margin-bottom: 2rem;
	}

	.grid :global(article h3 + p) {
		display: none;
	}
</style>
