<script>
	let {
		filter,
		tagFilter,
		orderBy,
		orderDirection,
		showAllTags,
		visibleTags,
		onFilterChange,
		onOrderChange,
		clearTagFilter,
		filterByTag
	} = $props()

	const filterOptions = [
		{value: 'all', label: 'All tracks'},
		{value: 'has-t-param', label: 'Has time parameter'},
		{value: 'missing-description', label: 'Missing description'},
		{value: 'no-tags', label: 'No tags'},
		{value: 'single-tag', label: 'Single tag'},
		{value: 'no-meta', label: 'No metadata'},
		{value: 'has-meta', label: 'Has metadata'}
	]

	const orderOptions = [
		{value: 'created_at', label: 'Created'},
		{value: 'title', label: 'Title'},
		{value: 'updated_at', label: 'Updated'}
	]
</script>

<section>
	<div class="filter-group">
		<label>
			Filter:
			<select bind:value={filter} onchange={(e) => onFilterChange(e.target.value)}>
				{#each filterOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>

		<label>
			Order by:
			<select bind:value={orderBy} onchange={(e) => onOrderChange(e.target.value, orderDirection)}>
				{#each orderOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>

		<label>
			Direction:
			<select bind:value={orderDirection} onchange={(e) => onOrderChange(orderBy, e.target.value)}>
				<option value="desc">Newest first</option>
				<option value="asc">Oldest first</option>
			</select>
		</label>
	</div>

	{#if visibleTags.length > 0}
		<div>
			<div class="tag-filter-header">
				<span>Filter by tag:</span>
				{#if tagFilter}
					<button onclick={clearTagFilter}>Clear tag filter</button>
				{/if}
			</div>

			<div class="tag-list">
				{#each visibleTags as { tag, count } (tag)}
					<button class:active={tagFilter === tag} onclick={() => filterByTag(tag)}>
						{tag} ({count})
					</button>
				{/each}
			</div>

			{#if !showAllTags}
				<button onclick={() => (showAllTags = true)}>Show all tags</button>
			{/if}
		</div>
	{/if}
</section>

<style>
	.filter-group {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.tag-filter-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-bottom: 0.5rem;
	}

	.tag-list button {
		padding: 0.2rem 0.5rem;
		cursor: pointer;
	}
</style>
