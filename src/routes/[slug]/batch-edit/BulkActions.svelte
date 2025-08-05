<script>
	let {filteredTracks, hasSelection, selectedCount, bulkEdit, selectAll, clearSelection} = $props()
</script>

<section>
	<div class="selection-info">
		{#if hasSelection}
			<span>{selectedCount} selected</span>
			<button onclick={clearSelection}>Clear</button>
		{:else}
			<button onclick={selectAll}>Select All ({filteredTracks.length})</button>
		{/if}
	</div>

	{#if hasSelection}
		<div class="bulk-operations">
			<label>
				Title:
				<input
					type="text"
					placeholder="New title for selected tracks"
					onchange={(e) => bulkEdit('title', e.target.value)}
				/>
			</label>

			<label>
				Description:
				<input
					type="text"
					placeholder="New description for selected tracks"
					onchange={(e) => bulkEdit('description', e.target.value)}
				/>
			</label>

			<label>
				URL:
				<input
					type="url"
					placeholder="New URL for selected tracks"
					onchange={(e) => bulkEdit('url', e.target.value)}
				/>
			</label>
		</div>
	{/if}
</section>

<style>
	.selection-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.bulk-operations {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
</style>
