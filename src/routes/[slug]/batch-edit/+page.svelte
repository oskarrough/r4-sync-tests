<script>
	import {stageEdit, commitEdits, discardEdits, getEdits} from '$lib/api'
	import {pullTracks} from '$lib/sync'
	import {invalidateAll} from '$app/navigation'
	import BulkActions from './BulkActions.svelte'
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
		<p>
			<strong
				>IMPORTANT: This is local-only. No remote data is overwritten. It is safe to play. you can
				edit any radio.</strong
			>
		</p>
	</nav>
	<menu>
		<select bind:value={filter}>
			<option value="all">all tracks ({tracks.length})</option>
			<option value="has-t-param">has &t= param</option>
			<option value="missing-description">empty description</option>
			<option value="no-tags">no tags</option>
			<option value="single-tag">single tag</option>
			<option value="no-meta">no metadata</option>
			<option value="has-meta">has metadata</option>
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

<BulkActions
	{filteredTracks}
	{hasSelection}
	{selectedCount}
	{bulkEdit}
	{selectAll}
	{clearSelection}
/>

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
					editingCell={null}
					editingValue=""
					{getCurrentValue}
					{startEdit}
					{saveEdit}
					{handleKeydown}
					{focus}
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
	header nav {
		display: flex;
		flex-flow: row;
		align-items: center;
		margin: 0.5rem 0 0.5rem 0;
		p {
			margin: 0 0 0 auto;
		}
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
</style>
