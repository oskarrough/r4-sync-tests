<script>
	import {pg} from '$lib/r5/db'
	import {liveQuery, incrementalLiveQuery} from '$lib/live-query'
	import {appState} from '$lib/app-state.svelte'
	import Tracklist from './tracklist.svelte'
	import TrackCard from './track-card.svelte'
	import Modal from './modal.svelte'
	import SearchInput from './search-input.svelte'
	import fuzzysort from 'fuzzysort'
	import {tooltip} from '$lib/components/tooltip-attachment.js'

	let view = $state('queue') // 'queue' or 'history'
	let showClearHistoryModal = $state(false)
	let searchQuery = $state('')

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {import('$lib/types').Track[]} */
	let queueTracks = $state([])

	/** @type {(import('$lib/types').Track & import('$lib/types').PlayHistory)[]} */
	let playHistory = $state([])

	let filteredQueueTracks = $derived(
		searchQuery
			? fuzzysort
					.go(searchQuery, queueTracks, {
						keys: ['title', 'tags', 'channel_name'],
						threshold: -10000
					})
					.map((result) => result.obj)
			: queueTracks
	)

	let filteredPlayHistory = $derived(
		searchQuery
			? fuzzysort
					.go(searchQuery, playHistory, {
						keys: ['title', 'tags', 'channel_name'],
						threshold: -10000
					})
					.map((result) => result.obj)
			: playHistory
	)

	$effect(() => {
		if (trackIds.length === 0) {
			queueTracks = []
			return
		}

		const uniqueIds = [...new Set(trackIds)]
		return incrementalLiveQuery(
			`SELECT twm.*
			 FROM tracks_with_meta twm
			 WHERE twm.id IN (select unnest($1::uuid[]))`,
			[uniqueIds],
			'id',
			(res) => {
				const trackMap = new Map(res.rows.map((track) => [track.id, track]))
				queueTracks = trackIds.map((id) => trackMap.get(id)).filter(Boolean)
			}
		)
	})

	$effect(() => {
		return liveQuery(
			`SELECT twm.*, h.started_at, h.ended_at, h.ms_played, h.reason_start, h.reason_end, h.skipped
			 FROM play_history h
			 JOIN tracks_with_meta twm ON h.track_id = twm.id
			 ORDER BY h.started_at ASC`,
			[],
			(res) => {
				playHistory = res.rows
			}
		)
	})

	function clearQueue() {
		appState.playlist_tracks = []
		appState.playlist_track = undefined
	}

	async function clearHistory() {
		await pg.sql`DELETE FROM play_history`
		showClearHistoryModal = false
	}
</script>

<aside>
	<header>
		<menu>
			<button onclick={() => (view = 'queue')} class:active={view === 'queue'}>Queue ({queueTracks.length})</button>
			<button onclick={() => (view = 'history')} class:active={view === 'history'}
				>History ({playHistory.length})</button
			>
		</menu>
	</header>

	<div class="search-container">
		<SearchInput bind:value={searchQuery} placeholder="Search {view}..." />
		{#if view === 'queue' && trackIds.length > 0}
			<button onclick={clearQueue} {@attach tooltip({content: 'Clear queued tracks'})}>Clear</button>
		{:else if view === 'history' && playHistory.length > 0}
			<button onclick={() => (showClearHistoryModal = true)} {@attach tooltip({content: 'Clear playlist history'})}
				>Clear</button
			>
		{/if}
	</div>

	<main class="scroll">
		{#if view === 'queue'}
			{#if filteredQueueTracks.length > 0}
				<Tracklist tracks={filteredQueueTracks} />
			{:else if trackIds.length > 0 && searchQuery}
				<div class="empty-state">
					<p>No tracks found</p>
					<p><small>Try a different search term</small></p>
				</div>
			{:else if trackIds.length === 0}
				<div class="empty-state">
					<p>No tracks in queue</p>
					<p><small>Select a channel to start playing</small></p>
				</div>
			{:else}
				<div class="empty-state">
					<p>No tracks found</p>
					<p><small>Try a different search term</small></p>
				</div>
			{/if}
		{:else if filteredPlayHistory.length > 0}
			<ul class="list tracks">
				{#each filteredPlayHistory as entry, index (index)}
					<li>
						<TrackCard track={entry} {index}>
							<p class="history">
								<small>
									{new Date(entry.started_at).toLocaleTimeString()}
									{#if entry.reason_start}• {entry.reason_start}{/if}
									{#if entry.reason_end}→ {entry.reason_end}{/if}
									{#if entry.ms_played}• {Math.round(entry.ms_played / 1000)}s{/if}
								</small>
							</p>
						</TrackCard>
					</li>
				{/each}
			</ul>
		{:else if playHistory.length > 0 && searchQuery}
			<div class="empty-state">
				<p>No history found</p>
				<p><small>Try a different search term</small></p>
			</div>
		{:else}
			<div class="empty-state">
				<p>No play history</p>
				<p><small>Start playing tracks to see history</small></p>
			</div>
		{/if}
	</main>
</aside>

<Modal bind:showModal={showClearHistoryModal}>
	{#snippet header()}
		<h2>Clear listening history</h2>
	{/snippet}
	<p>Are you sure you want to clear your listening history? This cannot be undone.</p>
	<menu>
		<button type="button" onclick={() => (showClearHistoryModal = false)}>Cancel</button>
		<button type="button" onclick={clearHistory} class="danger">Clear history</button>
	</menu>
</Modal>

<style>
	aside {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--aside-bg, var(--bg-2));
		border-left: 1px solid var(--gray-6);

		/* perf trick! */
		contain: layout size;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		background: var(--aside-bg, var(--bg-2));
		border-bottom: 1px solid var(--gray-5);
	}

	p.history {
		margin: 0 0 0 0.5rem;
	}

	main {
		flex: 1;
		padding-bottom: var(--player-compact-size);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;

		p {
			margin: 0;
		}

		small {
			color: var(--gray-9);
		}
	}

	.search-container {
		display: flex;
		padding: 0.5rem;
		border-bottom: 1px solid var(--gray-5);
		justify-content: space-between;
	}

	.tracks :global(.slug) {
		display: none;
	}
</style>
