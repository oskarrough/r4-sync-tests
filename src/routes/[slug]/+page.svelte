<script>
	import {onMount} from 'svelte'
	import {page} from '$app/state'
	import {goto} from '$app/navigation'
	import {setPlaylist, addToPlaylist, playTrack} from '$lib/api'
	import {searchTracks} from '$lib/search'
	import {relativeDate, relativeDateSolar} from '$lib/dates'
	import Icon from '$lib/components/icon.svelte'
	import SearchInput from '$lib/components/search-input.svelte'
	import ChannelHero from '$lib/components/channel-hero.svelte'
	import ButtonPlay from '$lib/components/button-play.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import LinkEntities from '$lib/components/link-entities.svelte'
	import BookmarkButton from '$lib/components/bookmark-button.svelte'

	let {data} = $props()

	let channel = $state(data.channel)

	let tracks = $state([])
	let latestTrackDate = $derived(tracks[0]?.created_at)

	/** @type {string[]} */
	let trackIds = $derived([])
	let searchQuery = $derived(data.search || '')
	let debounceTimer = $state()

	onMount(() => {
		data.tracksPromise.then((x) => {
			tracks = x
		})
		const search = page.url.searchParams.get('search')
		if (search) searchQuery = search
	})

	$effect(() => {
		if (!channel?.id || !searchQuery?.trim()) return
		performSearch()
	})

	function debouncedSearch() {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(performSearch, 200)
	}

	async function playSearchResults() {
		await setPlaylist(trackIds)
		await playTrack(trackIds[0])
	}

	async function performSearch() {
		if (!searchQuery?.trim()) return
		try {
			const tracks = await searchTracks(searchQuery, data.slug)
			trackIds = tracks.map((track) => track.id)
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
				<ButtonPlay {channel} class="primary" />
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
					)}. {channel.track_count} tracks
				</small>
			</p>
		</header>

		<section>
			<header style="padding-top: 0.5rem">
				<form onsubmit={handleSubmit}>
					<SearchInput
						bind:value={searchQuery}
						placeholder="Search {channel?.name || 'channel'}..."
						oninput={debouncedSearch}
					/>
					{#if trackIds.length > 0}
						<menu>
							<button onclick={playSearchResults}>Play all</button>
							<button onclick={() => addToPlaylist(trackIds)}>Add to queue</button>
							<!--<a href="/{data.slug}/batch-edit" class="btn">Batch edit</a>-->
						</menu>
					{/if}
				</form>
			</header>

			{#await data.tracksPromise}
				<p style="margin-top:1rem; margin-left: 0.5rem;">Loading tracks…</p>
			{:then whatevs}
				{@const ids = trackIds.length ? trackIds : whatevs.map((x) => x.id)}
				{#if ids.length > 0}
					<Tracklist {ids} />
				{:else}
					<p>No tracks found{searchQuery ? ` for "${searchQuery}"` : ''}</p>
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
		min-width: 150px;
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
		display: flex;
		padding-top: 1rem;
		font-size: var(--font-9);
		gap: 0.5rem;
		align-items: center;
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
