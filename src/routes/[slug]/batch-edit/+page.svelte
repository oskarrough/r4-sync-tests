<script>
	import {onMount} from 'svelte'
	import {pg} from '$lib/db'
	import {stageEdit, commitEdits, discardEdits, getEdits} from '$lib/api'
	import {pullTracks} from '$lib/sync'
	import {pullTrackMetaYouTubeFromChannel} from '$lib/sync/youtube'
	import {pullMusicBrainz} from '$lib/sync/musicbrainz'
	import {extractYouTubeId} from '$lib/utils'
	import {SvelteSet, SvelteMap} from 'svelte/reactivity'

	import TrackRow from './TrackRow.svelte'
	import BulkActions from './BulkActions.svelte'
	import FilterControls from './FilterControls.svelte'
	import EditPreview from './EditPreview.svelte'

	let {data} = $props()

	const channel = $derived(data.channel)
	let tracks = $state([])
	let selectedTracks = new SvelteSet()

	let editCount = $state(0)
	let edits = $state([])
	let hasEdits = $derived(editCount > 0)

	let showPreview = $state(false)
	let updatingMeta = $state(false)

	let editingCell = $state(null) // {trackId, field}
	let editingValue = $state('')

	let filter = $state('all')
	let tagFilter = $state('')
	let orderBy = $state('created_at')
	let orderDirection = $state('desc')
	let showAllTags = $state(false)

	let selectedCount = $derived(selectedTracks.size)
	let hasSelection = $derived(selectedCount > 0)

	let filteredTracks = $derived.by(() => {
		let filtered = tracks.filter((track) => {
			// Apply primary filter
			let matches = true
			switch (filter) {
				case 'has-t-param':
					matches = track.url?.includes('&t=') || track.url?.includes('?t=')
					break
				case 'missing-description':
					matches = !track.description
					break
				case 'no-tags':
					matches = !track.tags || track.tags.length === 0
					break
				case 'single-tag':
					matches = track.tags && track.tags.length === 1
					break
				case 'no-meta':
					matches = !track.has_youtube_meta && !track.has_musicbrainz_meta
					break
				case 'has-meta':
					matches = track.has_youtube_meta || track.has_musicbrainz_meta
					break
				default:
					matches = true
			}

			// Apply tag filter if specified
			if (matches && tagFilter) {
				matches = track.tags && track.tags.includes(tagFilter)
			}

			return matches
		})

		// Apply ordering
		return filtered.sort((a, b) => {
			const aVal = a[orderBy] || ''
			const bVal = b[orderBy] || ''
			const comparison =
				orderDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
			return comparison
		})
	})

	let allTags = $derived(tracks.flatMap((track) => track.tags || []))
	let tagCounts = $derived.by(() => {
		const counts = new SvelteMap()
		allTags.forEach((tag) => {
			counts.set(tag, (counts.get(tag) || 0) + 1)
		})
		return counts
	})
	let tagStats = $derived(
		Array.from(tagCounts.entries())
			.map(([tag, count]) => ({tag, count}))
			.sort((a, b) => b.count - a.count)
	)
	let visibleTags = $derived(showAllTags ? tagStats : tagStats.slice(0, 20))

	onMount(async () => {
		if (!data.channel?.id) return
		console.log(data)

		try {
			const tracksResult =
				await pg.sql`SELECT * from tracks where channel_id = ${data.channel.id} ORDER BY created_at DESC`
			console.log({tracksResult})
			tracks = tracksResult.rows
			console.log({tracks})
		} catch (error) {
			console.error('Error fetching tracks:', error)
		}

		const editCountResult = await pg.sql`SELECT COUNT(*) as count FROM track_edits`
		editCount = editCountResult.rows[0]?.count || 0
		console.log({editCount})
		edits = await getEdits()
		console.log({edits})
	})

	// Get current value for a field, considering staged edits
	const getCurrentValue = $derived.by(() => (trackId, field) => {
		const edit = edits.find((e) => e.track_id === trackId && e.field === field)
		if (edit) return edit.new_value

		const track = tracks.find((t) => t.id === trackId)
		return track?.[field] || ''
	})

	function selectTrack(trackId, event) {
		if (event.shiftKey && selectedTracks.size > 0) {
			// Shift+click: select range
			const trackIndex = filteredTracks.findIndex((t) => t.id === trackId)
			const lastSelected = Array.from(selectedTracks).pop()
			const lastIndex = filteredTracks.findIndex((t) => t.id === lastSelected)

			const start = Math.min(trackIndex, lastIndex)
			const end = Math.max(trackIndex, lastIndex)

			for (let i = start; i <= end; i++) {
				selectedTracks.add(filteredTracks[i].id)
			}
		} else if (event.ctrlKey || event.metaKey) {
			// Ctrl/Cmd+click: toggle selection
			if (selectedTracks.has(trackId)) {
				selectedTracks.delete(trackId)
			} else {
				selectedTracks.add(trackId)
			}
		} else {
			// Regular click: select only this track
			selectedTracks.clear()
			selectedTracks.add(trackId)
		}
	}

	function selectAll() {
		selectedTracks = new SvelteSet(filteredTracks.map((t) => t.id))
	}

	function clearSelection() {
		selectedTracks.clear()
		selectedTracks = new SvelteSet()
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

	function startEdit(trackId, field, currentValue, event) {
		event.stopPropagation()
		editingCell = {trackId, field}
		editingValue = currentValue || ''
	}

	async function saveEdit() {
		if (!editingCell) return

		const track = tracks.find((t) => t.id === editingCell.trackId)
		if (track && editingValue !== track[editingCell.field]) {
			await stageEdit(
				editingCell.trackId,
				editingCell.field,
				track[editingCell.field] || '',
				editingValue
			)
		}

		editingCell = null
		editingValue = ''
	}

	function cancelEdit() {
		editingCell = null
		editingValue = ''
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			cancelEdit()
		} else if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			saveEdit()
		}
	}

	function focus(element) {
		element.focus()
		element.select()
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

	function handleOrderChange(newOrderBy, newDirection) {
		orderBy = newOrderBy
		orderDirection = newDirection
	}

	function handleTrackSelect(trackId, event) {
		selectTrack(trackId, event)
	}

	async function handlePullMeta() {
		if (!channel?.id) return
		updatingMeta = true
		try {
			// First pull YouTube metadata for all tracks
			await pullTrackMetaYouTubeFromChannel(channel.id)

			// Then pull MusicBrainz data for tracks that don't have it yet
			const tracksNeedingMusicBrainz = tracks.filter((track) => {
				const ytid = extractYouTubeId(track.url)
				return ytid && track.title && !track.musicbrainz_data
			})

			// Pull MusicBrainz data for each track that needs it
			for (const track of tracksNeedingMusicBrainz) {
				const ytid = extractYouTubeId(track.url)
				if (ytid && track.title) {
					try {
						await pullMusicBrainz(ytid, track.title)
					} catch (error) {
						console.error(`MusicBrainz failed for track ${track.id}:`, error)
					}
				}
			}
		} catch (error) {
			console.error('Pull metadata failed:', error)
		} finally {
			updatingMeta = false
		}
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

	<fieldset>
		<legend>sort</legend>
		<select bind:value={orderBy}>
			<option value="created_at">created</option>
			<option value="updated_at">updated</option>
		</select>
		<button onclick={() => (orderDirection = orderDirection === 'desc' ? 'asc' : 'desc')}>
			{orderDirection === 'desc' ? '↓' : '↑'}
		</button>
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
	{orderBy}
	{orderDirection}
	{showAllTags}
	{visibleTags}
	onFilterChange={handleFilterChange}
	onTagFilterChange={handleTagFilterChange}
	onOrderChange={handleOrderChange}
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
					isSelected={selectedTracks.has(track.id)}
					{selectedTracks}
					{editingCell}
					{editingValue}
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
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
	}
</style>
