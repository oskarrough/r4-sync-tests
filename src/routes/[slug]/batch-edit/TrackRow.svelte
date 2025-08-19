<script>
	import InlineEditCell from './InlineEditCell.svelte'

	let {track, isSelected, selectedTracks, onSelect, data, edits, onEdit} = $props()

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

	<div class="col-url">
		<InlineEditCell {track} field="url" {edits} {onEdit} />
	</div>
	<div class="col-title">
		<InlineEditCell {track} field="title" {edits} {onEdit} />
	</div>

	<div class="col-description">
		<InlineEditCell {track} field="description" {edits} {onEdit} />
	</div>
	<div class="col-discogs">
		<InlineEditCell {track} field="discogs_url" {edits} {onEdit} />
	</div>
	<div class="col-tags">{track.tags || ''}</div>
	<div class="col-mentions">{track.mentions || ''}</div>

	<div class="col-meta">
		{#if track.has_youtube_meta}<span class="meta-indicator yt">Y</span>{/if}
		{#if track.has_musicbrainz_meta}<span class="meta-indicator mb">M</span>{/if}
		{#if track.has_discogs_meta}<span class="meta-indicator dc">D</span>{/if}
	</div>

	<div class="col-date">{new Date(track.created_at).toLocaleDateString()}</div>
</div>

<style>
	.track-row {
		display: flex;
		place-items: center;
		min-height: 2.5rem;
	}

	.col-checkbox,
	.col-link {
		text-align: center;
	}

	.col-title,
	.col-tags,
	.col-mentions,
	.col-description,
	.col-url {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.col-title,
	.col-description {
		flex: 2;
	}

	.col-meta {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.col-date {
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
