<script>
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import SvelteVirtualList from '@humanspeak/svelte-virtual-list'
	import {page} from '$app/state'
	import {channelsCollection, tracksCollection, updateTrack} from '../../tanstack/collections'
	import {appState} from '$lib/app-state.svelte'
	import TrackRow from './TrackRow.svelte'
	import * as m from '$lib/paraglide/messages'

	let slug = $derived(page.params.slug)

	const channelQuery = useLiveQuery((q) =>
		q
			.from({channels: channelsCollection})
			.where(({channels}) => eq(channels.slug, slug))
			.orderBy(({channels}) => channels.created_at, 'desc')
			.limit(1)
	)

	const tracksQuery = useLiveQuery((q) =>
		q
			.from({tracks: tracksCollection})
			.where(({tracks}) => eq(tracks.slug, slug))
			.orderBy(({tracks}) => tracks.created_at, 'desc')
	)

	let channel = $derived(channelQuery.data?.[0])
	let tracks = $derived(tracksQuery.data || [])
	const readonly = $derived(channel?.source === 'v1')
	const canEdit = $derived(!readonly && appState.channels?.includes(channel?.id))

	/** @type {string[]} */
	let selectedTracks = $state([])
	let filter = $state('all')

	let selectedCount = $derived(selectedTracks.length)
	let hasSelection = $derived(selectedCount > 0)

	let filteredTracks = $derived.by(() => {
		if (!tracks) return []
		return tracks.filter((track) => {
			switch (filter) {
				case 'has-t-param':
					return track.url?.includes('&t=')
				case 'missing-description':
					return !track.description?.trim()
				case 'no-tags':
					return !track.tags?.length
				case 'single-tag':
					return track.tags?.length === 1
				case 'no-meta':
					return !track.title && !track.description
				case 'has-meta':
					return track.title || track.description
				case 'has-error':
					return !!track.playback_error
				case 'has-duration':
					return track.duration > 0
				case 'no-duration':
					return !track.duration
				default:
					return true
			}
		})
	})

	function selectTrack(trackId, event) {
		if (event.shiftKey && selectedTracks.length > 0) {
			const trackIndex = filteredTracks.findIndex((t) => t.id === trackId)
			const lastSelected = selectedTracks[selectedTracks.length - 1]
			const lastIndex = filteredTracks.findIndex((t) => t.id === lastSelected)

			const start = Math.min(trackIndex, lastIndex)
			const end = Math.max(trackIndex, lastIndex)

			const rangeIds = []
			for (let i = start; i <= end; i++) {
				rangeIds.push(filteredTracks[i].id)
			}
			selectedTracks = [...new Set([...selectedTracks, ...rangeIds])]
		} else if (event.ctrlKey || event.metaKey) {
			if (selectedTracks.includes(trackId)) {
				selectedTracks = selectedTracks.filter((id) => id !== trackId)
			} else {
				selectedTracks = [...selectedTracks, trackId]
			}
		} else {
			selectedTracks = [trackId]
		}
	}

	function selectAll() {
		selectedTracks = filteredTracks.map((t) => t.id)
	}

	function clearSelection() {
		selectedTracks = []
	}

	async function onEdit(trackId, field, newValue) {
		if (!channel || !canEdit) return
		const track = tracks.find((t) => t.id === trackId)
		if (!track || track[field] === newValue) return
		await updateTrack(channel, trackId, {[field]: newValue})
	}
</script>

<svelte:head>
	<title>{m.batch_edit_page_title({name: channel?.name || m.channel_page_fallback()})}</title>
</svelte:head>

{#if channelQuery.isLoading}
	<p style="padding: 1rem;">Loading...</p>
{:else if !channel}
	<p style="padding: 1rem;">Channel not found</p>
{:else}
	<header>
		<nav>
			<a href="/{slug}">@{channel.name}</a>
			{m.batch_edit_nav_suffix()}
			{#if readonly}
				<span style="color: var(--color-yellow);">(v1 channel - read only)</span>
			{:else if !canEdit}
				<span style="color: var(--color-yellow);">(no edit access)</span>
			{/if}
		</nav>
		<menu>
			<select bind:value={filter}>
				<option value="all">{m.batch_edit_filter_all()}</option>
				<option value="missing-description">{m.batch_edit_filter_missing_description()}</option>
				<option value="single-tag">{m.batch_edit_filter_single_tag()}</option>
				<option value="no-tags">{m.batch_edit_filter_no_tags()}</option>
				<option value="no-meta">{m.batch_edit_filter_no_meta()}</option>
				<option value="has-meta">{m.batch_edit_filter_has_meta()}</option>
				<option value="has-t-param">{m.batch_edit_filter_has_t_param()}</option>
				<option value="has-error">{m.batch_edit_filter_has_error()}</option>
				<option value="has-duration">{m.batch_edit_filter_has_duration()}</option>
				<option value="no-duration">{m.batch_edit_filter_no_duration()}</option>
			</select>
		</menu>
	</header>

	<main class="tracks-container">
		<section class="tracks">
			{#if tracksQuery.isLoading}
				<p>Loading tracks...</p>
			{:else if filteredTracks.length === 0}
				<p>{m.batch_edit_no_tracks()}</p>
			{:else}
				<div class="tracks-list">
					<div class="tracks-header">
						<div class="col-checkbox">
							<menu class="selection">
								{#if hasSelection}
									<span>{m.batch_edit_selected_count({count: selectedCount})}</span>
									<button onclick={clearSelection}>{m.common_clear()}</button>
								{:else}
									<button onclick={selectAll}>{m.batch_edit_select_all({count: filteredTracks.length})}</button>
								{/if}
							</menu>
						</div>
						<div class="col-link"></div>
						<div class="col-url">{m.batch_edit_column_url()}</div>
						<div class="col-title">{m.batch_edit_column_title()}</div>
						<div class="col-description">{m.batch_edit_column_description()}</div>
						<div class="col-discogs">{m.batch_edit_column_discogs()}</div>
						<div class="col-tags">{m.batch_edit_column_tags()}</div>
						<div class="col-mentions">{m.batch_edit_column_mentions()}</div>
						<div class="col-meta">{m.batch_edit_column_meta()}</div>
						<div class="col-duration">{m.batch_edit_column_duration()}</div>
						<div class="col-error">{m.batch_edit_column_error()}</div>
						<div class="col-date">{m.batch_edit_column_created()}</div>
					</div>
					<SvelteVirtualList
						items={filteredTracks}
						defaultEstimatedItemHeight={32}
						bufferSize={20}
						viewportClass="virtual-viewport"
					>
						{#snippet renderItem(track)}
							<TrackRow
								{track}
								{slug}
								isSelected={selectedTracks.includes(track.id)}
								{selectedTracks}
								onSelect={(e) => selectTrack(track.id, e)}
								{onEdit}
								{canEdit}
							/>
						{/snippet}
					</SvelteVirtualList>
				</div>
			{/if}
		</section>
	</main>
{/if}

<style>
	header nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
	}

	header menu {
		padding: 0 0.5rem;
	}

	.tracks-header {
		display: flex;
		position: sticky;
		top: 0;
		z-index: 1;
		font-weight: bold;
		background: var(--gray-1);
		border-bottom: 1px solid var(--gray-7);
	}

	.tracks-container {
		min-width: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		height: calc(100vh - 120px);
	}

	.tracks-list {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.tracks-list :global(.svelte-virtual-list-container) {
		flex: 1;
		min-height: 0;
	}

	:global(.virtual-viewport) {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.tracks {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	:global(.col-checkbox),
	:global(.col-link),
	:global(.col-title),
	:global(.col-tags),
	:global(.col-mentions),
	:global(.col-description),
	:global(.col-url),
	:global(.col-discogs),
	:global(.col-meta),
	:global(.col-date) {
		padding: 0.2rem;
		flex: 1;
		text-align: left;
	}

	:global(.col-title),
	:global(.col-description),
	:global(.col-discogs) {
		flex: 2;
	}

	:global(.col-checkbox),
	:global(.col-link) {
		flex: 0 0 40px;
	}

	:global(.col-meta) {
		flex: 0 0 60px;
	}

	:global(.col-duration) {
		flex: 0 0 60px;
	}

	:global(.col-error) {
		flex: 0 0 80px;
	}

	:global(.col-date) {
		flex: 0 0 100px;
	}
</style>
