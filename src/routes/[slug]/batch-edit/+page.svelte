<script>
	import {appState} from '$lib/app-state.svelte'
	import {batchEdit} from '$lib/batch-edit.svelte'
	import {r5} from '$lib/r5'
	import EditsPanel from './EditsPanel.svelte'
	import TrackRow from './TrackRow.svelte'
	import * as m from '$lib/paraglide/messages'

	let {data} = $props()

	let {channel, tracks} = $derived(data)
	const readonly = $derived(channel?.source === 'v1')
	const canEdit = $derived(!readonly && appState.channels && appState.channels.includes(channel.id))

	let {edits, appliedEdits} = $derived(data)
	let hasEdits = $derived(edits?.length > 0)

	/** @type {import('$lib/types').Track[]} */
	let selectedTracks = $state([])

	let filter = $state('all')

	let selectedCount = $derived(selectedTracks.length)
	let hasSelection = $derived(selectedCount > 0)

	let tracksMap = $derived(new Map(tracks?.map((t) => [t.id, t]) || []))

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
				default:
					return true
			}
		})
	})

	function selectTrack(trackId, event) {
		if (event.shiftKey && selectedTracks.length > 0) {
			// Shift+click: select range
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
			// Ctrl/Cmd+click: toggle selection
			if (selectedTracks.includes(trackId)) {
				selectedTracks = selectedTracks.filter((id) => id !== trackId)
			} else {
				selectedTracks = [...selectedTracks, trackId]
			}
		} else {
			// Regular click: select only this track
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
		const track = tracks.find((t) => t.id === trackId)
		if (!track) return
		const originalValue = track[field] || ''
		try {
			await batchEdit.stageFieldEdit(trackId, field, originalValue, newValue)
		} catch (error) {
			console.error('Failed to stage edit:', error)
		}
	}
</script>

<svelte:head>
	<title>{m.batch_edit_page_title({name: channel?.name || m.channel_page_fallback()})}</title>
</svelte:head>

<header>
	<nav>
		<a href="/{data.slug}">@{channel?.name}</a> {m.batch_edit_nav_suffix()}
		{#if hasEdits}
			<span>{m.batch_edit_edit_count({count: edits.length})}</span>
		{/if}
		<p>
			<strong>{m.batch_edit_warning()}</strong>
		</p>
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
		</select>
		<button onclick={() => r5.tracks.pull({slug: data.slug})}>{m.batch_edit_pull_tracks()}</button>
		<!--
		<button onclick={handlePullMeta} disabled={updatingMeta}>
			{updatingMeta ? '⏳ Pulling...' : '⏱️ Pull metadata (YouTube + MusicBrainz)'}
		</button>
		-->
	</menu>
</header>

<div class="batch-edit-layout">
	<main class="tracks-container">
		<section class="tracks">
			{#if filteredTracks.length === 0}
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
						<div class="col-date">{m.batch_edit_column_created()}</div>
					</div>
					<ol class="list scroll">
						{#each filteredTracks as track (track.id)}
							<li>
								<TrackRow
									{track}
									isSelected={selectedTracks.includes(track.id)}
									{selectedTracks}
									onSelect={(e) => selectTrack(track.id, e)}
									{data}
									{edits}
									{onEdit}
								/>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</section>
	</main>

	<EditsPanel
		{edits}
		{appliedEdits}
		{tracksMap}
		{readonly}
		{canEdit}
		onCommit={() => batchEdit.commit()}
		onDiscard={() => batchEdit.discard()}
		onUndo={(trackId, field) => batchEdit.undo(trackId, field)}
		onDelete={(trackId, field) => batchEdit.deletePendingEdit(trackId, field)}
	/>
</div>

<style>
	header nav {
		display: flex;
		align-items: center;
		p {
			margin: 0 0 0 auto;
		}
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

	.batch-edit-layout {
		border-top: 1px solid var(--gray-5);
		display: grid;
		grid-template-columns: 1fr min(400px, 40%);
		height: 100%;
		position: relative;
	}

	.tracks-container {
		min-width: 0;
		overflow: hidden;
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

	:global(.col-date) {
		flex: 0 0 100px;
	}
</style>
