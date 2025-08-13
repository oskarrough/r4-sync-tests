<script>
	import {stageEdit, commitEdits, discardEdits, getEdits} from '$lib/api'
	import {r5} from '$lib/r5'
	import {SvelteSet, SvelteMap} from 'svelte/reactivity'
	import TrackRow from './TrackRow.svelte'
	import EditsPanel from './EditsPanel.svelte'

	let {data} = $props()

	let {channel, tracks, edits} = $derived(data)

	/** @type {import('$lib/types').Track[]} */
	let selectedTracks = $state([])

	let hasEdits = $derived(edits?.length > 0)
	let showSidebar = $state(false)
	let updatingMeta = $state(false)

	// Allow multiple cells to be edited simultaneously
	let editingCells = new SvelteSet() // Set of 'trackId-field' strings

	let filter = $state('all')

	let selectedCount = $derived(selectedTracks.length)
	let hasSelection = $derived(selectedCount > 0)

	// Create a derived map for efficient edit lookups
	let editsMap = $derived.by(() => {
		const map = new SvelteMap()
		if (edits) {
			for (const edit of edits) {
				map.set(`${edit.track_id}-${edit.field}`, edit)
			}
		}
		return map
	})

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
			showSidebar = false
			edits = []
			editingCells.clear()
		} catch (error) {
			console.error('Commit failed:', error)
		}
	}

	async function handleDiscard() {
		try {
			await discardEdits()
			showSidebar = false
			edits = []
			editingCells.clear()
		} catch (error) {
			console.error('Discard failed:', error)
		}
	}

	$effect(() => {
		if (hasEdits && !showSidebar && edits?.length > 5) {
			// Auto-show sidebar when many edits accumulate
			showSidebar = true
		}
	})

	async function stageFieldEdit(trackId, field, newValue) {
		const track = tracks.find((t) => t.id === trackId)
		if (!track) return

		const originalValue = track[field] || ''
		if (newValue === originalValue) {
			// Remove edit if value reverted to original
			const existingEdit = editsMap.get(`${trackId}-${field}`)
			if (existingEdit) {
				edits = edits.filter((e) => !(e.track_id === trackId && e.field === field))
			}
			return
		}

		try {
			await stageEdit(trackId, field, originalValue, newValue)
			edits = await getEdits()
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
</script>

<svelte:head>
	<title>Batch Edit - {channel?.name || 'Channel'}</title>
</svelte:head>

<header>
	<nav>
		<a href="/{data.slug}">@{channel?.name}</a> / batch edit
		{#if hasEdits}
			<button onclick={() => (showSidebar = !showSidebar)} class="edits-toggle">
				{edits.length} edits {showSidebar ? '→' : '←'}
			</button>
		{/if}
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

<div class="batch-edit-layout" class:sidebar-visible={showSidebar}>
	<main class="tracks-container">
		<section class="tracks scroll">
			{#if filteredTracks.length === 0}
				<p>no tracks found</p>
			{:else}
				<div class="tracks-list">
					<div class="tracks-header">
						<div class="col-checkbox"></div>
						<div class="col-link"></div>
						<div class="col-url">url</div>
						<div class="col-title">title</div>
						<div class="col-description">description</div>
						<div class="col-tags">tags</div>
						<div class="col-mentions">mentions</div>
						<div class="col-meta">meta</div>
						<div class="col-date">created</div>
					</div>
					<ol class="list">
						{#each filteredTracks as track (track.id)}
							<li>
								<TrackRow
									{track}
									isSelected={selectedTracks.includes(track.id)}
									{selectedTracks}
									onSelect={(e) => selectTrack(track.id, e)}
									{data}
									{editingCells}
									{editsMap}
									{stageFieldEdit}
									{tracks}
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
		{tracks}
		{showSidebar}
		onClose={() => (showSidebar = false)}
		onCommit={handleCommit}
		onDiscard={handleDiscard}
	/>
</div>

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
		padding: 0.2rem;
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

	.batch-edit-layout {
		display: grid;
		grid-template-columns: 1fr;
		height: 100%;
		position: relative;
	}

	.batch-edit-layout.sidebar-visible {
		grid-template-columns: 1fr min(400px, 40%);
	}

	.tracks-container {
		min-width: 0;
		overflow: hidden;
	}

	.edits-toggle {
		background: var(--accent);
		color: white;
		border: none;
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-size: 0.85rem;
		margin-left: 1rem;
	}
</style>
