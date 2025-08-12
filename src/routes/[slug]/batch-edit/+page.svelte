<script>
	import {stageEdit, commitEdits, discardEdits, getEdits} from '$lib/api'
	import {r5} from '$lib/r5'
	import {invalidateAll} from '$app/navigation'
	import EditPreview from './EditPreview.svelte'
	import TrackRow from './TrackRow.svelte'

	let {data} = $props()

	let {channel, editCount, edits, tracks} = $derived(data)
	let selectedTracks = $state([])

	let hasEdits = $derived(editCount > 0)

	let showPreview = $state(false)
	let updatingMeta = $state(false)

	let editingCell = $state(null) // {trackId, field}

	let filter = $state('all')

	let selectedCount = $derived(selectedTracks.length)
	let hasSelection = $derived(selectedCount > 0)

	let filteredTracks = $derived.by(() => {
		if (!tracks) return []

		let filtered = tracks

		if (filter !== 'all') {
			filtered = tracks.filter((track) => {
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
		}
		return filtered
	})

	function getCurrentValue(trackId, field) {
		// Check if there's a staged edit for this track+field
		const edit = edits?.find((e) => e.track_id === trackId && e.field === field)
		if (edit) {
			return edit.new_value
		}

		// Fallback to original track data
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
			await invalidateAll()
		} catch (error) {
			console.error('Bulk edit failed:', error)
		}
	}

	async function handleCommit() {
		try {
			await commitEdits()
			showPreview = false
			await invalidateAll()
		} catch (error) {
			console.error('Commit failed:', error)
		}
	}

	async function handleDiscard() {
		try {
			await discardEdits()
			showPreview = false
			await invalidateAll()
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

	async function stageFieldEdit(trackId, field, newValue) {
		const track = tracks.find((t) => t.id === trackId)
		if (!track) return

		const originalValue = track[field] || ''
		if (newValue === originalValue) return // No change

		try {
			await stageEdit(trackId, field, originalValue, newValue)
			edits = await getEdits()
			await invalidateAll()
		} catch (error) {
			console.error('Failed to stage edit:', error)
		}
	}

	async function handlePullTracks() {
		try {
			await r5.tracks.pull({slug: data.slug})
		} catch (error) {
			console.error('Pull tracks failed:', error)
		}
	}

	async function handlePullMeta() {
		console.log('TODO: implement metadata pulling')
	}

	function focus(element) {
		element?.focus()
		element?.select()
	}
</script>

{#snippet inlineEdit(trackId, field)}
	{@const track = tracks.find((t) => t.id === trackId)}
	{@const isEditing = editingCell?.trackId === trackId && editingCell?.field === field}
	{@const currentValue = getCurrentValue(trackId, field)}

	{#if isEditing}
		<input
			type="text"
			value={currentValue}
			onblur={(e) => {
				editingCell = null
				stageFieldEdit(trackId, field, e.target.value)
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault()
					editingCell = null
					stageFieldEdit(trackId, field, e.target.value)
				} else if (e.key === 'Escape') {
					e.preventDefault()
					editingCell = null
				}
			}}
			use:focus
		/>
	{:else}
		<span
			class="editable"
			class:has-edit={currentValue !== (track?.[field] || '')}
			onclick={(e) => {
				e.stopPropagation()
				editingCell = {trackId, field}
			}}
		>
			{currentValue}
		</span>
	{/if}
{/snippet}

<svelte:head>
	<title>Batch Edit - {channel?.name || 'Channel'}</title>
</svelte:head>

<header>
	<nav>
		<a href="/{data.slug}">@{channel?.name}</a> / batch edit
		<p>
			<strong
				>IMPORTANT: This is local-only. No remote data is overwritten. It is safe to play. you can
				edit any radio.</strong
			>
		</p>
	</nav>
	<menu>
		<select bind:value={filter}>
			<option value="all">All ({tracks.length})</option>
			<option value="missing-description">Empty description</option>
			<option value="single-tag">1 tag</option>
			<option value="no-tags">No tags</option>
			<option value="no-meta">No metadata</option>
			<option value="has-meta">Has metadata</option>
			<option value="has-t-param">has &t= param</option>
		</select>
		<button onclick={handlePullTracks}>Pull tracks</button>
		<button onclick={handlePullMeta} disabled={updatingMeta}>
			{updatingMeta ? '⏳ Pulling...' : '⏱️ Pull metadata (YouTube + MusicBrainz)'}
		</button>
	</menu>
</header>

<EditPreview
	{showPreview}
	{edits}
	{tracks}
	{hasEdits}
	{togglePreview}
	{handleCommit}
	{handleDiscard}
/>

{#if hasSelection}
	<section class="bulkOperations">
		<label>
			Update the description for {selectedCount} tracks:
			<input
				type="text"
				placeholder="Enter a description (any #tags or @mentions will be extracted)"
				onchange={(e) => bulkEdit('description', e.target.value)}
			/>
		</label>
	</section>
{/if}

<menu class="selection">
	{#if hasSelection}
		<span>{selectedCount} selected</span>
		<button onclick={clearSelection}>Clear</button>
	{:else}
		<button onclick={selectAll}>Select all ({filteredTracks.length})</button>
	{/if}
</menu>

<section class="tracks scroll">
	{#if filteredTracks.length === 0}
		<p>no tracks found</p>
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
					{inlineEdit}
					onSelect={(e) => selectTrack(track.id, e)}
					{data}
				/>
			{/each}
		</div>
	{/if}
</section>

<style>
	header {
		margin-left: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.bulkOperations {
		margin: 0.5rem;
	}

	.selection {
		margin: 0 0.5rem 0.5rem;
		align-items: center;
	}

	header nav {
		display: flex;
		flex-flow: row;
		align-items: center;
		margin: 0.5rem 0 0.5rem 0;
		p {
			margin: 0 0 0 auto;
		}
	}

	.tracks-header {
		border-top: 1px solid var(--gray-5);
		display: flex;
		position: sticky;
		top: 0;
		z-index: 1;
		font-weight: bold;
		border-bottom: 1px solid var(--gray-5);
		background: var(--bg-2);
	}

	:global(.col-checkbox),
	:global(.col-link),
	:global(.col-title),
	:global(.col-tags),
	:global(.col-mentions),
	:global(.col-description),
	:global(.col-url),
	:global(.col-meta),
	:global(.col-date) {
		padding: 0.5rem;
		flex: 1;
		text-align: left;
	}

	:global(.col-title),
	:global(.col-description) {
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

	.editable {
		cursor: pointer;
		padding: 2px;
		border-radius: 2px;
	}

	.editable:hover {
		background: var(--gray-1);
	}

	.editable.has-edit {
		background: var(--yellow-1);
	}
</style>
