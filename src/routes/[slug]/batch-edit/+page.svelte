<script>
	import {liveQuery} from '$lib/live-query'
	import {stageEdit, commitEdits, discardEdits, getEdits} from '$lib/api'
	import {SvelteSet} from 'svelte/reactivity'

	let {data} = $props()

	let channel = $state(data.channel)
	let tracks = $state([])
	let selectedTracks = new SvelteSet()
	let editCount = $state(0)
	let edits = $state([])
	let showPreview = $state(false)

	// Load tracks for this channel
	$effect(() => {
		if (!channel?.id) return

		return liveQuery(
			`SELECT id, title, tags, description, url, created_at 
			 FROM tracks 
			 WHERE channel_id = $1 
			 ORDER BY created_at DESC`,
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
			const trackIndex = tracks.findIndex((t) => t.id === trackId)
			const lastSelected = Array.from(selectedTracks).pop()
			const lastIndex = tracks.findIndex((t) => t.id === lastSelected)

			const start = Math.min(trackIndex, lastIndex)
			const end = Math.max(trackIndex, lastIndex)

			for (let i = start; i <= end; i++) {
				selectedTracks.add(tracks[i].id)
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
		selectedTracks = new SvelteSet(tracks.map((t) => t.id))
	}

	function clearSelection() {
		selectedTracks.clear()
		selectedTracks = new SvelteSet()
	}

	async function bulkEdit(field, newValue) {
		if (selectedTracks.size === 0) return

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
</script>

<svelte:head>
	<title>Batch Edit - {channel?.name || 'Channel'}</title>
</svelte:head>

<header>
	<h1>batch edit: {channel?.name}</h1>
	<nav>
		<a href="/{data.slug}">← back to channel</a>
	</nav>
</header>

<section class="controls">
	<div class="selection">
		<span>{selectedTracks.size} selected</span>
		<button onclick={selectAll} disabled={tracks.length === 0}>select all</button>
		<button onclick={clearSelection} disabled={selectedTracks.size === 0}>clear</button>
	</div>

	<div class="bulk-actions">
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
	</div>

	<div class="draft-actions">
		<span class="edit-count">{editCount} changes drafted</span>
		<button onclick={togglePreview} disabled={editCount === 0}>
			{showPreview ? 'hide' : 'preview'}
		</button>
		<button onclick={handleCommit} disabled={editCount === 0}>apply</button>
		<button onclick={handleDiscard} disabled={editCount === 0}>discard</button>
	</div>
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

<section class="tracks">
	<div class="tracks-list">
		<div class="tracks-header">
			<div class="col-checkbox"></div>
			<div class="col-title">title</div>
			<div class="col-description">description</div>
			<div class="col-url">url</div>
			<div class="col-date">created</div>
		</div>
		{#each tracks as track (track.id)}
			<div
				class="track-row"
				class:selected={selectedTracks.has(track.id)}
				onclick={(e) => selectTrack(track.id, e)}
			>
				<div class="col-checkbox">
					<input
						type="checkbox"
						checked={selectedTracks.has(track.id)}
						onchange={(e) =>
							e.target.checked ? selectedTracks.add(track.id) : selectedTracks.delete(track.id)}
					/>
				</div>
				<div class="col-title">{track.title}</div>
				<div class="col-description">{track.description || ''}</div>
				<div class="col-url">{track.url}</div>
				<div class="col-date">{new Date(track.created_at).toLocaleDateString()}</div>
			</div>
		{/each}
	</div>
</section>

<style>
	header {
		padding: 1rem;
		border-bottom: 1px solid var(--gray-5);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.controls {
		padding: 1rem;
		border-bottom: 1px solid var(--gray-5);
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.selection,
	.bulk-actions,
	.draft-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
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

	.col-title {
		flex: 1;
		padding: 0.5rem;
		font-weight: bold;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.col-description {
		flex: 1;
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
</style>
