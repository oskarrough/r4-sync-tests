<script>
	import {liveQuery} from '$lib/live-query'
	import {stageEdit, commitEdits, discardEdits, getEditCount, getEdits} from '$lib/api'
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

	// Monitor edit count
	$effect(() => {
		const interval = setInterval(async () => {
			try {
				editCount = await getEditCount()
				if (showPreview) {
					edits = await getEdits()
				}
			} catch (error) {
				console.error('Failed to get edit count:', error)
			}
		}, 500)

		return () => clearInterval(interval)
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
			placeholder="add tags (comma separated)"
			onkeydown={(e) => e.key === 'Enter' && bulkEdit('tags', e.target.value.trim())}
		/>
		<input
			type="text"
			placeholder="set title prefix"
			onkeydown={(e) => e.key === 'Enter' && bulkEdit('title', e.target.value.trim())}
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
		<table>
			<thead>
				<tr>
					<th>track</th>
					<th>field</th>
					<th>old → new</th>
				</tr>
			</thead>
			<tbody>
				{#each edits as edit (edit.track_id + edit.field)}
					{@const track = tracks.find((t) => t.id === edit.track_id)}
					<tr>
						<td>{track?.title || 'unknown'}</td>
						<td>{edit.field}</td>
						<td>
							<span class="old">{edit.old_value || '(empty)'}</span>
							→
							<span class="new">{edit.new_value}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

<section class="tracks">
	<table>
		<thead>
			<tr>
				<th width="40"></th>
				<th>title</th>
				<th>tags</th>
				<th>description</th>
				<th>created</th>
			</tr>
		</thead>
		<tbody>
			{#each tracks as track (track.id)}
				<tr class:selected={selectedTracks.has(track.id)} onclick={(e) => selectTrack(track.id, e)}>
					<td>
						<input
							type="checkbox"
							checked={selectedTracks.has(track.id)}
							onchange={(e) =>
								e.target.checked ? selectedTracks.add(track.id) : selectedTracks.delete(track.id)}
						/>
					</td>
					<td class="title">{track.title}</td>
					<td class="tags">{track.tags || ''}</td>
					<td class="description">{track.description || ''}</td>
					<td class="date">{new Date(track.created_at).toLocaleDateString()}</td>
				</tr>
			{/each}
		</tbody>
	</table>
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

	.preview table {
		width: 100%;
		border-collapse: collapse;
	}

	.preview th,
	.preview td {
		padding: 0.5rem;
		border: 1px solid var(--gray-5);
		text-align: left;
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

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		padding: 0.5rem;
		border-bottom: 1px solid var(--gray-5);
		text-align: left;
		vertical-align: top;
	}

	th {
		background: var(--gray-3);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	tbody tr {
		cursor: pointer;
	}

	tbody tr:hover {
		background: var(--gray-2);
	}

	tbody tr.selected {
		background: var(--blue-3);
	}

	.title {
		font-weight: bold;
		max-width: 20rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tags {
		max-width: 15rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: monospace;
		font-size: 0.8rem;
	}

	.description {
		max-width: 25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.date {
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
