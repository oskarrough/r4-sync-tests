<script>
	import {onMount} from 'svelte'
	import {page} from '$app/state'
	import {goto} from '$app/navigation'
	import {pg} from '$lib/r5/db'
	import {incrementalLiveQuery} from '$lib/live-query'
	import {setPlaylist, addToPlaylist} from '$lib/api'
	import {relativeDate, relativeDateSolar} from '$lib/dates'
	import Icon from '$lib/components/icon.svelte'
	import SearchInput from '$lib/components/search-input.svelte'
	import ChannelHero from '$lib/components/channel-hero.svelte'
	import ButtonPlay from '$lib/components/button-play.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import LinkEntities from '$lib/components/link-entities.svelte'

	let {data} = $props()

	let channel = $state(data.channel)
	let latestTrackDate = $state(null)

	/** @type {string[]} */
	let trackIds = $state([])
	let searchQuery = $state(data.search || '')
	let debounceTimer = $state()

	function debouncedSearch() {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(performSearch, 200)
	}

	// Live query for channel data to get updated track_count
	$effect(() => {
		if (!data.channel?.id) return

		return incrementalLiveQuery(
			'SELECT * FROM channels WHERE id = $1',
			[data.channel.id],
			'id',
			(res) => {
				if (res.rows.length > 0) {
					channel = res.rows[0]
				}
			}
		)
	})

	$effect(() => {
		if (!channel?.id) return

		const search = searchQuery?.trim()
		if (search) {
			// Use regular query for search (non-reactive)
			performSearch()
			return
		}

		// Use liveQuery for default track loading (reactive)
		return incrementalLiveQuery(
			'SELECT id, created_at FROM tracks WHERE channel_id = $1 ORDER BY created_at DESC',
			[channel.id],
			'id',
			(res) => {
				trackIds = res.rows.map((row) => row.id)
				if (res.rows.length > 0) {
					latestTrackDate = res.rows[0].created_at
				}
			}
		)
	})

	onMount(() => {
		const urlSearch = page.url.searchParams.get('search')
		if (urlSearch) {
			searchQuery = urlSearch
		}
	})

	async function performSearch() {
		if (!channel?.id || !searchQuery?.trim()) return
		try {
			const query = `%${searchQuery.toLowerCase()}%`
			const result = await pg.query(
				`SELECT id FROM tracks
				 WHERE channel_id = $1
				   AND (LOWER(title) LIKE $2 OR LOWER(description) LIKE $2 OR LOWER(url) LIKE $2)
				 ORDER BY created_at DESC`,
				[channel.id, query]
			)
			trackIds = result.rows.map((row) => row.id)
		} catch (error) {
			console.error('Failed to load tracks:', error)
		}
	}

	function handleSubmit(event) {
		event.preventDefault()
		updateURL()
	}

	function updateURL() {
		const params = new URL(page.url).searchParams
		params.delete('search')
		const search = searchQuery.trim()
		if (search) params.set('search', search)
		const url = `/${data.slug}${params.toString() ? `?${params}` : ''}`
		goto(url, {replaceState: true})
	}
</script>

<svelte:head>
	<title>{channel?.name || 'Channel'} - R5</title>
</svelte:head>

{#if channel}
	<article>
		<header>
			<ChannelHero {channel} />
			<h1>
				{channel.name}
				<ButtonPlay {channel} />
				{#if channel.longitude && channel.latitude}
					<a
						href={`/?display=map&slug=${channel.slug}&longitude=${channel.longitude}&latitude=${channel.latitude}&zoom=15`}
					>
						<Icon icon="map" />
					</a>
				{/if}
			</h1>
			<p><LinkEntities text={channel.description} /></p>
			{#if channel.url}
				<p><a href={channel.url} target="_blank" rel="noopener">{channel.url}</a></p>
			{/if}
			<p>
				<small>
					Broadcasting since {relativeDateSolar(channel.created_at)}. Updated {relativeDate(
						latestTrackDate || channel.updated_at
					)}.
				</small>
			</p>
		</header>
		<section>
			{#if trackIds.length > 0}
				<header style="padding-top: 1rem">
					<form onsubmit={handleSubmit}>
						<SearchInput
							bind:value={searchQuery}
							placeholder="Search {channel?.name || 'channel'}..."
							oninput={debouncedSearch}
						/>
						<menu>
							<button onclick={() => setPlaylist(trackIds)}>Play All</button>
							<button onclick={() => addToPlaylist(trackIds)}>Add to queue</button>
							<!--<a href="/{data.slug}/batch-edit" class="btn">Batch edit</a>-->
						</menu>
					</form>
				</header>

				<Tracklist ids={trackIds} />
			{:else if !channel.tracks_synced_at}
				<p style="margin-top:1rem; margin-left: 0.5rem;">Tracks syncing…</p>
			{:else}
				<p>No tracks found{searchQuery ? ` for "${searchQuery}"` : ''}</p>
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

	header:has(form) {
		position: sticky;
		top: -0.8rem;
		margin: 0.5rem 0.5rem;
		z-index: 1;
	}

	form {
		display: flex;
		flex-flow: row wrap;
		gap: 0.2rem 0.5rem;
		margin-bottom: 1rem;
		align-items: center;
	}

	form > :global(.search-input) {
		flex: 1;
	}

	article header :global(figure) {
		margin: 0.5rem 1rem 0rem 1rem;
		max-width: 60%;

		@media (min-width: 520px) {
			margin: 0.5rem 1rem 0rem 0.5rem;
			max-width: calc(100vw - 2rem);
			float: left;
			max-width: 13rem;
		}
	}

	h1,
	h1 ~ p {
		margin: 0 1.5rem;
	}

	h1 {
		padding-top: 1rem;
		font-size: var(--font-9);
	}

	h1 + p {
		font-size: var(--font-6);
		line-height: 1.3;
		max-width: 60ch;
	}

	section {
		clear: both;
	}

	section header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-right: 0.5rem;
	}
</style>
