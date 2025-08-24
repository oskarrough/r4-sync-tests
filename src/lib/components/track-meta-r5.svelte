<script>
	let {data} = $props()
	let showRaw = $state(false)

	function formatDuration(seconds) {
		if (!seconds) return ''
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	function formatDate(dateString) {
		if (!dateString) return ''
		return new Date(dateString).toLocaleDateString()
	}
</script>

{#if data}
	{#if showRaw}
		<pre><code>{JSON.stringify(data, null, 2)}</code></pre>
	{:else}
		<dl>
			{#if data.title}
				<dt>title</dt>
				<dd>{data.title}</dd>
			{/if}

			{#if data.channel_slug}
				<dt>channel</dt>
				<dd><a href="/{data.channel_slug}">@{data.channel_slug}</a></dd>
			{/if}

			{#if data.duration}
				<dt>duration</dt>
				<dd>{formatDuration(data.duration)}</dd>
			{/if}

			{#if data.tags && data.tags.length > 0}
				<dt>tags</dt>
				<dd class="tags">
					{#each data.tags as tag (tag)}
						<span class="tag">#{tag}</span>
					{/each}
				</dd>
			{/if}

			{#if data.description}
				<dt>description</dt>
				<dd>{data.description}</dd>
			{/if}

			{#if data.url}
				<dt>source</dt>
				<dd><a href={data.url} target="_blank" rel="noopener noreferrer">youtube</a></dd>
			{/if}

			{#if data.discogs_url}
				<dt>discogs</dt>
				<dd><a href={data.discogs_url} target="_blank" rel="noopener noreferrer">view release</a></dd>
			{/if}

			<dt>metadata</dt>
			<dd>
				{#if data.has_youtube_meta}✓ youtube{/if}
				{#if data.has_musicbrainz_meta}✓ musicbrainz{/if}
				{#if data.has_discogs_meta}✓ discogs{/if}
			</dd>

			{#if data.created_at}
				<dt>added</dt>
				<dd>{formatDate(data.created_at)}</dd>
			{/if}

			{#if data.updated_at && data.updated_at !== data.created_at}
				<dt>updated</dt>
				<dd>{formatDate(data.updated_at)}</dd>
			{/if}
		</dl>
	{/if}

	<button onclick={() => (showRaw = !showRaw)}>
		{showRaw ? 'formatted view' : 'raw json'}
	</button>
{:else}
	<p>No track data available</p>
{/if}

<style>
	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--space-2);
		margin: var(--space-3) 0;
	}

	dt {
		color: var(--gray-10);
		font-size: var(--font-3);
	}

	dd {
		margin: 0;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.tag {
		background: var(--gray-3);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--border-radius);
		font-size: var(--font-2);
	}

	a {
		color: var(--color-accent);
	}

	button {
		margin-top: var(--space-3);
	}

	pre {
		font-size: var(--font-3);
		overflow-x: auto;
	}
</style>