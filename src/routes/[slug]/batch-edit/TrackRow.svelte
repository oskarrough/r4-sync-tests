<script>
	let {
		track,
		isSelected,
		selectedTracks,
		editingCell,
		editingValue,
		getCurrentValue,
		startEdit,
		saveEdit,
		handleKeydown,
		focus,
		onSelect,
		data
	} = $props()

	function handleCheckboxChange(e) {
		if (e.target.checked) {
			selectedTracks = [...selectedTracks, track.id]
		} else {
			selectedTracks = selectedTracks.filter((id) => id !== track.id)
		}
	}
</script>

<div class="track-row" class:selected={isSelected} onclick={onSelect}>
	<div class="col-checkbox">
		<input type="checkbox" checked={isSelected} onchange={handleCheckboxChange} />
	</div>

	<div class="col-link">
		<a
			href="/{data.slug}/tracks/{track.id}"
			target="_blank"
			rel="noopener noreferrer"
			title="Open track page">↗</a
		>
	</div>

	<div
		class="col-title"
		onclick={(e) => startEdit(track.id, 'title', getCurrentValue(track.id, 'title'), e)}
	>
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
			{@const currentValue = getCurrentValue(track.id, 'title')}
			<span class="editable" class:has-edit={currentValue !== (track.title || '')}>
				{currentValue}
			</span>
		{/if}
	</div>

	<div class="col-tags">{track.tags || ''}</div>
	<div class="col-mentions">{track.mentions || ''}</div>

	<div
		class="col-description"
		onclick={(e) => startEdit(track.id, 'description', getCurrentValue(track.id, 'description'), e)}
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
			{@const currentValue = getCurrentValue(track.id, 'description')}
			<span class="editable" class:has-edit={currentValue !== (track.description || '')}>
				{currentValue}
			</span>
		{/if}
	</div>

	<div
		class="col-url"
		onclick={(e) => startEdit(track.id, 'url', getCurrentValue(track.id, 'url'), e)}
	>
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
			{@const currentValue = getCurrentValue(track.id, 'url')}
			<span class="editable" class:has-edit={currentValue !== (track.url || '')}>
				{currentValue}
			</span>
		{/if}
	</div>

	<div class="col-meta">
		{#if track.has_youtube_meta}<span class="meta-indicator yt">Y</span>{/if}
		{#if track.has_musicbrainz_meta}<span class="meta-indicator mb">M</span>{/if}
	</div>

	<div class="col-date">{new Date(track.created_at).toLocaleDateString()}</div>
</div>

<style>
	.track-row {
		display: flex;
		cursor: pointer;
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.col-mentions {
		flex: 1;
		padding: 0.5rem;
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

	.col-date {
		flex: 0 0 100px;
		padding: 0.5rem;
		white-space: nowrap;
	}

	.editable {
		cursor: pointer;
	}

	.inline-edit {
		width: 100%;
		border: none;
		background: transparent;
		font: inherit;
	}

	.meta-indicator {
		padding: 0.1rem 0.3rem;
		border-radius: 0.2rem;
	}
</style>
