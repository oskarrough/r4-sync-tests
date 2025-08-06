<script>
	import {trap} from '$lib/focus'
	import {page} from '$app/state'
	import {pg} from '$lib/db'
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
			performSearch()
		} else if (!urlSearch && searchQuery) {
			searchQuery = ''
			clear()
		}
	})

	function clear() {
		channels = []
		tracks = []
	}

	async function performSearch() {
		if (searchQuery.trim().length < 2) return clear()

		isLoading = true

		// Handle @mention searches with channel-specific track search
		const isMention = searchQuery.startsWith('@')

		if (isMention) {
			// Parse "@oskar dance" -> channelSlug="oskar", trackQuery="dance"
			const mentionContent = searchQuery.slice(1).trim()
			const spaceIndex = mentionContent.indexOf(' ')
			const channelSlug = spaceIndex > -1 ? mentionContent.slice(0, spaceIndex) : mentionContent
			const trackQuery = spaceIndex > -1 ? mentionContent.slice(spaceIndex + 1).trim() : ''

			try {
				// Always search for matching channels
				const channelResults = await pg.query(
					`
					SELECT id, name, slug, description, image,
					       GREATEST(
					         similarity(name, $2),
					         similarity(description, $2),
					         similarity(slug, $2)
					       ) as similarity_score
					FROM channels
					WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(slug) LIKE $1
					   OR name % $2 OR description % $2 OR slug % $2
					ORDER BY similarity_score DESC, name
				`,
					[`%${channelSlug.toLowerCase()}%`, channelSlug]
				)
				channels = channelResults.rows

				// If we have a track query, also search tracks within that channel
				if (trackQuery) {
					const trackResults = await pg.query(
						`
						SELECT *
						FROM tracks_with_meta 
						WHERE channel_slug = $1 
						AND (LOWER(title) LIKE $2 OR LOWER(description) LIKE $2)
						ORDER BY title
					`,
						[channelSlug, `%${trackQuery.toLowerCase()}%`]
					)
					tracks = trackResults.rows
				} else {
					tracks = []
				}
			} catch (error) {
				console.error('search:error', error)
			}
		} else {
			// Regular search
			const query = `%${searchQuery.toLowerCase()}%`

			try {
				// Channel search with fuzzy matching using pg_trgm
				const channelResults = await pg.query(
					`
					SELECT id, name, slug, description, image,
					       GREATEST(
					         similarity(name, $2),
					         similarity(description, $2),
					         similarity(slug, $2)
					       ) as similarity_score
					FROM channels
					WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(slug) LIKE $1
					   OR name % $2 OR description % $2 OR slug % $2
					ORDER BY similarity_score DESC, name
				`,
					[query, searchQuery]
				)

				// Track search on title and description
				const trackResults = await pg.query(
					`
					SELECT *
					FROM tracks_with_meta 
					WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1
					ORDER BY title
				`,
					[query]
				)

				channels = channelResults.rows
				tracks = trackResults.rows
			} catch (error) {
				console.error('search:error', error)
			}
		}

		isLoading = false
	}
</script>

<svelte:head>
	<title>Search - Radio4000</title>
</svelte:head>

<article use:trap>
	{#if searchQuery && !isLoading && tracks.length > 0}
		<menu>
			<button type="button" onclick={() => setPlaylist(tracks.map((t) => t.id))}>Play all</button>
			<button type="button" onclick={() => addToPlaylist(tracks.map((t) => t.id))}
				>Add to queue</button
			>
			<small
				>Showing {channels.length} channels and {tracks.length} tracks for "{searchQuery}"</small
			>
		</menu>
	{/if}

	{#if searchQuery && !isLoading}
		{#if channels.length === 0 && tracks.length === 0}
			<p>No results found for "{searchQuery}"</p>
			<p>Tip: use @slug to find tracks in a channel</p>
		{/if}

		{#if channels.length > 0}
			<section>
				<h2>{channels.length} Channels</h2>
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
