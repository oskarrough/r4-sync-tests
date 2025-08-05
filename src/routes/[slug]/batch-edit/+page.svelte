<script>
	import {liveQuery} from '$lib/live-query'
	import {stageEdit, commitEdits, discardEdits, getEdits} from '$lib/api'
	import {pullTracks} from '$lib/sync'
	import {pullTrackMetaYouTubeFromChannel} from '$lib/sync/youtube'
	import {pullMusicBrainz} from '$lib/sync/musicbrainz'
	import {extractYouTubeId} from '$lib/utils'
	import {SvelteSet, SvelteMap} from 'svelte/reactivity'

	let {data} = $props()

	let channel = $state(data.channel)
	let tracks = $state([])
	let selectedTracks = new SvelteSet()
	let editCount = $state(0)
	let edits = $state([])
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
	let hasEdits = $derived(editCount > 0)
	let hasTracksToClear = $derived(filteredTracks.length > 0)

	let filteredTracks = $derived(
		tracks.filter((track) => {
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
	)

	let tagStats = $derived(() => {
		const tagCounts = new SvelteMap()
		tracks.forEach((track) => {
			if (track.tags && track.tags.length > 0) {
				track.tags.forEach((tag) => {
					tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
				})
			}
		})
		return Array.from(tagCounts.entries())
			.map(([tag, count]) => ({tag, count}))
			.sort((a, b) => b.count - a.count)
	})

	// Load tracks for this channel
	$effect(() => {
		if (!channel?.id) return

		return liveQuery(
			`SELECT t.id, t.title, t.tags, t.mentions, t.description, t.url, t.created_at, t.updated_at,
			        tm.youtube_data IS NOT NULL as has_youtube_meta,
			        tm.musicbrainz_data IS NOT NULL as has_musicbrainz_meta
			 FROM tracks t
			 LEFT JOIN track_meta tm ON tm.ytid = ytid(t.url)
			 WHERE t.channel_id = $1 
			 ORDER BY ${orderBy} ${orderDirection}`,
			[channel.id],
			(result) => {
				tracks = result.rows
			}
		)
	})

	// Monitor edit count with live query
	$effect(() => {
		return liveQuery('SELECT COUNT(*) as count FROM track_edits', [], (result) => {
			editCount = result.rows[0]?.count || 0
			if (showPreview) {
				getEdits()
					.then((result) => (edits = result))
					.catch(console.error)
			}
		})
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
		selectedTracks = new SvelteSet(selectedTracks) // trigger reactivity
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
		<button onclick={selectAll} disabled={!hasTracksToClear}>select all</button>
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

{#if showPreview && edits.length > 0}
	<section class="preview">
		<h3>preview changes</h3>
		<div class="preview-list">
			<div class="preview-header">
				<div>track</div>
				<div>field</div>
				<div>old → new</div>
			</div>
			{#each edits as edit (edit.track_id + edit.field)}
				{@const track = tracks.find((t) => t.id === edit.track_id)}
				<div class="preview-row">
					<div>{track?.title || 'unknown'}</div>
					<div>{edit.field}</div>
					<div>
						<span class="old">{edit.old_value || '(empty)'}</span>
						→
						<span class="new">{edit.new_value}</span>
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}

<section class="tag-stats">
	<div class="tag-stats-header">
		<h3>tag usage ({tagStats().length} unique tags)</h3>
		{#if tagFilter}
			<span class="active-filter">
				filtering by: <strong>{tagFilter}</strong>
				<button onclick={clearTagFilter} class="clear-filter">×</button>
			</span>
		{/if}
	</div>
	<div class="tag-cloud">
		{#each showAllTags ? tagStats() : tagStats().slice(0, 20) as { tag, count } (tag)}
			<span
				class="tag-item"
				class:active={tagFilter === tag}
				title="{count} tracks - click to filter"
				onclick={() => filterByTag(tag)}
			>
				{tag} <span class="tag-count">({count})</span>
			</span>
		{/each}
		{#if tagStats().length > 20}
			<button class="show-more" onclick={() => (showAllTags = !showAllTags)}>
				{showAllTags ? 'show less' : `show all ${tagStats().length} tags`}
			</button>
		{/if}
	</div>
</section>

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
				<div
					class="track-row"
					class:selected={selectedTracks.has(track.id)}
					onclick={(e) => selectTrack(track.id, e)}
				>
					<div class="col-checkbox">
						<input
							type="checkbox"
							checked={selectedTracks.has(track.id)}
							onchange={(e) => {
								if (e.target.checked) {
									selectedTracks.add(track.id)
								} else {
									selectedTracks.delete(track.id)
								}
								selectedTracks = new SvelteSet(selectedTracks)
							}}
						/>
					</div>
					<div class="col-link">
						<a
							href="/{data.slug}/tracks/{track.id}"
							target="_blank"
							rel="noopener noreferrer"
							title="Open track page">↗</a
						>
					</div>
					<div class="col-title" onclick={(e) => startEdit(track.id, 'title', track.title, e)}>
						{#if editingCell?.trackId === track.id && editingCell?.field === 'title'}
							<input
								type="text"
								bind:value={editingValue}
								onblur={saveEdit}
								onkeydown={handleKeydown}
								class="inline-edit"
								use:focus
							/>
						{:else}
							<span class="editable">{track.title}</span>
						{/if}
					</div>
					<div class="col-tags">{track.tags || ''}</div>
					<div class="col-mentions">{track.mentions || ''}</div>
					<div
						class="col-description"
						onclick={(e) => startEdit(track.id, 'description', track.description, e)}
					>
						{#if editingCell?.trackId === track.id && editingCell?.field === 'description'}
							<input
								type="text"
								bind:value={editingValue}
								onblur={saveEdit}
								onkeydown={handleKeydown}
								class="inline-edit"
								use:focus
							/>
						{:else}
							<span class="editable">{track.description || ''}</span>
						{/if}
					</div>
					<div class="col-url" onclick={(e) => startEdit(track.id, 'url', track.url, e)}>
						{#if editingCell?.trackId === track.id && editingCell?.field === 'url'}
							<input
								type="text"
								bind:value={editingValue}
								onblur={saveEdit}
								onkeydown={handleKeydown}
								class="inline-edit"
								use:focus
							/>
						{:else}
							<span class="editable">{track.url}</span>
						{/if}
					</div>
					<div class="col-meta">
						{#if track.has_youtube_meta}<span class="meta-indicator yt">Y</span>{/if}
						{#if track.has_musicbrainz_meta}<span class="meta-indicator mb">M</span>{/if}
					</div>
					<div class="col-date">{new Date(track.created_at).toLocaleDateString()}</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	header {
		padding: 1rem;
		border-bottom: 1px solid var(--gray-5);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	nav.view-controls {
		display: flex;
		gap: 2rem;
		padding: 1rem;
		border-bottom: 1px solid var(--gray-5);
		align-items: end;
	}

	.selection-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		background: var(--gray-1);
		border-bottom: 1px solid var(--gray-5);
	}

	.actions {
		padding: 1rem;
		border-bottom: 1px solid var(--gray-5);
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.data-management {
		padding: 0.5rem 1rem;
		background: var(--gray-1);
		border-bottom: 1px solid var(--gray-5);
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	legend {
		font-size: 0.85rem;
		color: var(--gray-11);
		margin-bottom: 0.25rem;
	}

	menu {
		display: flex;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	output {
		font-size: 0.9rem;
		color: var(--gray-11);
	}

	.edit-count {
		font-weight: bold;
		color: var(--orange-11);
	}

	.preview {
		padding: 1rem;
		background: var(--gray-2);
		border-bottom: 1px solid var(--gray-5);
	}

	.preview-list {
		display: flex;
		flex-direction: column;
	}

	.preview-header {
		display: flex;
		background: var(--gray-3);
		font-weight: bold;
		border-bottom: 1px solid var(--gray-5);
	}

	.preview-header > div {
		padding: 0.5rem;
		flex: 1;
		border-right: 1px solid var(--gray-5);
	}

	.preview-header > div:last-child {
		border-right: none;
	}

	.preview-row {
		display: flex;
		border-bottom: 1px solid var(--gray-5);
	}

	.preview-row > div {
		padding: 0.5rem;
		flex: 1;
		border-right: 1px solid var(--gray-5);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.preview-row > div:last-child {
		border-right: none;
	}

	.old {
		color: var(--red-11);
		text-decoration: line-through;
	}

	.new {
		color: var(--green-11);
		font-weight: bold;
	}

	.tracks {
		overflow-x: auto;
	}

	.tracks-list {
		display: flex;
		flex-direction: column;
		font-size: 0.9rem;
	}

	.tracks-header {
		display: flex;
		background: var(--gray-3);
		font-weight: bold;
		border-bottom: 1px solid var(--gray-5);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.track-row {
		display: flex;
		border-bottom: 1px solid var(--gray-5);
		cursor: pointer;
	}

	.track-row:hover {
		background: var(--gray-2);
	}

	.track-row.selected {
		background: var(--blue-3);
	}

	.col-checkbox {
		flex: 0 0 40px;
		padding: 0.5rem;
		text-align: center;
	}

	.col-link {
		flex: 0 0 30px;
		padding: 0.5rem;
		text-align: center;
	}

	.col-link a {
		color: var(--gray-11);
		text-decoration: none;
		font-size: 0.9rem;
	}

	.col-link a:hover {
		color: var(--blue-11);
	}

	.col-title {
		flex: 2;
		padding: 0.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.col-tags {
		flex: 1;
		padding: 0.5rem;
		font-size: 0.8rem;
		color: var(--gray-11);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.col-mentions {
		flex: 1;
		padding: 0.5rem;
		font-size: 0.8rem;
		color: var(--gray-11);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.col-description {
		flex: 2;
		padding: 0.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.col-url {
		flex: 1;
		padding: 0.5rem;
		font-family: monospace;
		font-size: 0.8rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.col-meta {
		flex: 0 0 60px;
		padding: 0.5rem;
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.meta-indicator {
		display: inline-block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		font-size: 0.7rem;
		font-weight: bold;
		text-align: center;
		line-height: 16px;
		color: white;
	}

	.meta-indicator.yt {
		background: var(--red-9);
	}

	.meta-indicator.mb {
		background: var(--green-9);
	}

	.col-date {
		flex: 0 0 100px;
		padding: 0.5rem;
		font-size: 0.8rem;
		color: var(--gray-11);
		white-space: nowrap;
	}

	input[type='text'] {
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--gray-6);
		border-radius: var(--border-radius);
		min-width: 12rem;
	}

	button {
		padding: 0.3rem 0.8rem;
		border: 1px solid var(--gray-6);
		border-radius: var(--border-radius);
		background: var(--gray-1);
		cursor: pointer;
	}

	button:hover {
		background: var(--gray-3);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.editable {
		cursor: pointer;
		border-radius: 2px;
		padding: 1px 3px;
		transition: background-color 0.1s;
	}

	.editable:hover {
		background: var(--gray-3);
	}

	.inline-edit {
		width: 100%;
		border: 1px solid var(--blue-7);
		border-radius: 2px;
		padding: 2px 4px;
		font-size: inherit;
		font-family: inherit;
		background: white;
		outline: none;
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
		color: var(--gray-11);
	}

	.tag-stats {
		padding: 1rem;
		border-bottom: 1px solid var(--gray-5);
		background: var(--gray-1);
	}

	.tag-stats-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.tag-stats h3 {
		margin: 0;
		font-size: 1rem;
		color: var(--gray-12);
	}

	.active-filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--blue-11);
	}

	.clear-filter {
		background: var(--red-9);
		color: white;
		border: none;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		line-height: 1;
		cursor: pointer;
		padding: 0;
	}

	.clear-filter:hover {
		background: var(--red-10);
	}

	.tag-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		line-height: 1.5;
	}

	.tag-item {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: var(--gray-3);
		border: 1px solid var(--gray-6);
		border-radius: var(--border-radius);
		font-size: 0.85rem;
		cursor: pointer;
		transition: background-color 0.1s;
	}

	.tag-item:hover {
		background: var(--gray-4);
	}

	.tag-item.active {
		background: var(--blue-3);
		border-color: var(--blue-7);
		color: var(--blue-11);
	}

	.tag-count {
		color: var(--gray-11);
		font-size: 0.8em;
	}

	.show-more {
		background: var(--gray-2);
		border: 1px dashed var(--gray-6);
		color: var(--gray-11);
		font-size: 0.85rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: all 0.1s;
	}

	.show-more:hover {
		background: var(--gray-3);
		border-color: var(--gray-7);
		color: var(--gray-12);
	}
</style>
