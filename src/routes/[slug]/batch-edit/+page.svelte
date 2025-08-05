<script>
	import {stageEdit, commitEdits, discardEdits, getEdits} from '$lib/api'
	import {pullTracks} from '$lib/sync'
	import BulkActions from './BulkActions.svelte'
	import FilterControls from './FilterControls.svelte'
	import EditPreview from './EditPreview.svelte'
	import TrackRow from './TrackRow.svelte'

	let {data} = $props()

	let {channel, editCount, edits, tracks} = $derived(data)
	let selectedTracks = $state([])

	let hasEdits = $derived(editCount > 0)

	let showPreview = $state(false)
	let updatingMeta = $state(false)

	// TODO: Re-implement inline editing - track which cell is being edited and its value
	// let editingCell = $state(null) // {trackId, field}
	// let editingValue = $state('')

	let filter = $state('all')
	let tagFilter = $state('')
	let showAllTags = $state(false)

	let selectedCount = $derived(selectedTracks.length)
	let hasSelection = $derived(selectedCount > 0)

	// TODO: Re-implement track filtering with simple function call instead of complex derived
	// Should filter by: has-t-param, missing-description, no-tags, single-tag, no-meta, has-meta
	// Also apply tag filter if specified
	let filteredTracks = $derived(tracks)

	// TODO: Re-implement tag cloud with static computation on mount instead of derived cascade
	// Should count all tags from tracks, sort by frequency, show top 20 by default
	let visibleTags = $state([])

	// TODO: Re-implement getCurrentValue as simple function instead of derived
	// Should check edits first, fallback to track data
	function getCurrentValue(trackId, field) {
		const track = tracks.find((t) => t.id === trackId)
		return track?.[field] || ''
	}

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

	async function bulkEdit(field, newValue) {
		if (!hasSelection) return

		try {
			for (const trackId of selectedTracks) {
				const track = tracks.find((t) => t.id === trackId)
				if (track) {
					await stageEdit(trackId, field, track[field] || '', newValue)
				}
			}
		} catch (error) {
			console.error('Bulk edit failed:', error)
		}
	}

	async function handleCommit() {
		try {
			await commitEdits()
			showPreview = false
		} catch (error) {
			console.error('Commit failed:', error)
		}
	}

	async function handleDiscard() {
		try {
			await discardEdits()
			showPreview = false
		} catch (error) {
			console.error('Discard failed:', error)
		}
	}

	async function togglePreview() {
		showPreview = !showPreview
		if (showPreview) {
			edits = await getEdits()
		}
	}

	// TODO: Re-implement inline editing functions
	// startEdit, saveEdit, cancelEdit, handleKeydown, focus
	function startEdit() {
		console.log('TODO: inline editing')
	}
	function saveEdit() {
		console.log('TODO: inline editing')
	}
	function handleKeydown() {
		console.log('TODO: inline editing')
	}
	function focus() {
		console.log('TODO: inline editing')
	}

	async function handlePullTracks() {
		try {
			await pullTracks(data.slug)
		} catch (error) {
			console.error('Pull tracks failed:', error)
		}
	}

	function filterByTag(tag) {
		tagFilter = tagFilter === tag ? '' : tag
	}

	function clearTagFilter() {
		tagFilter = ''
	}

	function handleFilterChange(newFilter) {
		filter = newFilter
	}

	function handleTagFilterChange(newTagFilter) {
		tagFilter = newTagFilter
	}

	function handleTrackSelect(trackId, event) {
		selectTrack(trackId, event)
	}

	// TODO: Re-implement metadata pulling with simpler approach
	// Should pull YouTube metadata first, then MusicBrainz for tracks that need it
	async function handlePullMeta() {
		console.log('TODO: implement metadata pulling')
	}
</script>

<svelte:head>
	<title>Batch Edit - {channel?.name || 'Channel'}</title>
</svelte:head>

<header>
	<nav>
		<a href="/{data.slug}">@{channel?.name}</a> / batch edit
	</nav>
	<p>
		IMPORTANT: This only changes local data. No remote data is touched or written to. This also
		means you can edit ANY channel. It is safe to experiment. Changes will be overwritten next time
		you sync/pull. Later we'll enable remote writes.
	</p>
</header>

<nav class="view-controls">
	<fieldset>
		<legend>filter</legend>
		<select bind:value={filter}>
			<option value="all">all tracks ({tracks.length})</option>
			<option value="has-t-param">has &t= param</option>
			<option value="missing-description">empty description</option>
			<option value="no-tags">no tags</option>
			<option value="single-tag">single tag</option>
			<option value="no-meta">no metadata</option>
			<option value="has-meta">has metadata</option>
		</select>
		<output>showing {filteredTracks.length}</output>
	</fieldset>
</nav>

<section class="selection-controls">
	<output>{selectedCount} selected</output>
	<menu>
		<button onclick={selectAll} disabled={filteredTracks.length === 0}>select all</button>
		<button onclick={clearSelection} disabled={!hasSelection}>clear</button>
	</menu>
</section>

<section class="actions">
	<fieldset>
		<legend>bulk edit</legend>
		<input
			type="text"
			placeholder="set title"
			onkeydown={(e) => e.key === 'Enter' && bulkEdit('title', e.target.value.trim())}
		/>
		<input
			type="text"
			placeholder="set description"
			onkeydown={(e) => e.key === 'Enter' && bulkEdit('description', e.target.value.trim())}
		/>
		<input
			type="text"
			placeholder="set url"
			onkeydown={(e) => e.key === 'Enter' && bulkEdit('url', e.target.value.trim())}
		/>
	</fieldset>

	<fieldset>
		<legend>changes</legend>
		<output class="edit-count">{editCount} changes drafted</output>
		<menu>
			<button onclick={togglePreview} disabled={!hasEdits}>
				{showPreview ? 'hide' : 'preview'}
			</button>
			<button onclick={handleCommit} disabled={!hasEdits}>apply</button>
			<button onclick={handleDiscard} disabled={!hasEdits}>discard</button>
		</menu>
	</fieldset>
</section>

<section class="data-management">
	<menu>
		<button onclick={handlePullTracks}>reload tracks from remote</button>
		<button onclick={handlePullMeta} disabled={updatingMeta}>
			{updatingMeta ? '⏳ pulling...' : '⏱️ pull metadata (YouTube + MusicBrainz)'}
		</button>
	</menu>
</section>

<EditPreview
	{showPreview}
	{edits}
	{tracks}
	{hasEdits}
	{togglePreview}
	{handleCommit}
	{handleDiscard}
/>

<FilterControls
	{filter}
	{tagFilter}
	{showAllTags}
	{visibleTags}
	onFilterChange={handleFilterChange}
	onTagFilterChange={handleTagFilterChange}
	{clearTagFilter}
	{filterByTag}
/>

<BulkActions
	{selectedTracks}
	{filteredTracks}
	{hasSelection}
	{selectedCount}
	{bulkEdit}
	{selectAll}
	{clearSelection}
/>

<section class="tracks">
	{#if filteredTracks.length === 0}
		<div class="empty-state">
			<p>no tracks found</p>
		</div>
	{:else}
		<div class="tracks-list">
			<div class="tracks-header">
				<div class="col-checkbox"></div>
				<div class="col-link"></div>
				<div class="col-title">title</div>
				<div class="col-tags">tags</div>
				<div class="col-mentions">mentions</div>
				<div class="col-description">description</div>
				<div class="col-url">url</div>
				<div class="col-meta">meta</div>
				<div class="col-date">created</div>
			</div>
			{#each filteredTracks as track (track.id)}
				<TrackRow
					{track}
					isSelected={selectedTracks.includes(track.id)}
					{selectedTracks}
					editingCell={null}
					editingValue=""
					{getCurrentValue}
					{startEdit}
					{saveEdit}
					{handleKeydown}
					{focus}
					onSelect={(e) => handleTrackSelect(track.id, e)}
					{data}
				/>
			{/each}
		</div>
	{/if}
</section>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	nav.view-controls {
		display: flex;
		gap: 2rem;
		align-items: end;
	}

	.selection-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.actions {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	menu {
		display: flex;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tracks {
		overflow-x: auto;
	}

	.tracks-list {
		display: flex;
		flex-direction: column;
	}

	.tracks-header {
		display: flex;
		position: sticky;
		top: 0;
		z-index: 1;
		font-weight: bold;
		background: var(--gray-1);
		border-bottom: 1px solid var(--gray-4);
	}

	.tracks-header > div {
		padding: 0.5rem;
		flex: 1;
		text-align: left;
	}

	.tracks-header .col-checkbox,
	.tracks-header .col-link {
		flex: 0 0 40px;
	}

	.tracks-header .col-meta {
		flex: 0 0 60px;
	}

	.tracks-header .col-date {
		flex: 0 0 100px;
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
	}
</style>
