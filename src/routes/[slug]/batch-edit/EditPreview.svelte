<script>
	let {showPreview, edits, tracks, hasEdits, togglePreview, handleCommit, handleDiscard} = $props()

	const getTrackTitle = (trackId) => {
		const track = tracks.find((t) => t.id === trackId)
		return track?.title || `Track ${trackId}`
	}
</script>

{#if hasEdits}
	<section>
		<header>
			<menu>
				<p>{edits.length} staged edits &rarr;</p>
				<button onclick={togglePreview}>
					{showPreview ? 'Hide' : 'Show'}
				</button>
				<button onclick={handleCommit}>Commit</button>
				<button onclick={handleDiscard}>Discard</button>
			</menu>
		</header>

		{#if showPreview}
			<div class="edit-list scroll">
				{#each edits as edit (edit.track_id + edit.field)}
					<div class="edit-item">
						<div>{getTrackTitle(edit.track_id)}</div>
						<div>{edit.field}</div>
						<div class="edit-change">
							<span class="old-value">{edit.old_value || '(empty)'}</span>
							<span>→</span>
							<span>{edit.new_value}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	section {
		margin: 0 0.5rem;
	}
	menu p {
		margin: auto 0;
	}

	.edit-list {
		max-height: 300px;
	}

	.edit-item {
		display: grid;
		grid-template-columns: 200px 100px 1fr;
		gap: 1rem;
		padding: 0.5rem;
	}

	.edit-change {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.old-value {
		text-decoration: line-through;
	}
</style>
