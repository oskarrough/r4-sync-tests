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
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now - date
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

		if (diffDays < 30) return `${diffDays} days ago`
		if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
		return `${Math.floor(diffDays / 365)} years ago`
	}
</script>

{#if data}
	{#if showRaw}
		<pre><code>{JSON.stringify(data, null, 2)}</code></pre>
	{:else}
		<dl>
			{#if data.duration}
				<dt>duration</dt>
				<dd>{formatDuration(data.duration)}</dd>
			{/if}

			{#if data.publishedAt}
				<dt>published</dt>
				<dd>{formatDate(data.publishedAt)}</dd>
			{/if}

			{#if data.channelTitle}
				<dt>channel</dt>
				<dd>{data.channelTitle}</dd>
			{/if}

			{#if data.thumbnails?.medium?.url}
				<dt>thumbnail</dt>
				<dd>
					<img src={data.thumbnails.medium.url} alt="Video thumbnail" loading="lazy" />
				</dd>
			{/if}

			{#if data.description}
				<dt>description</dt>
				<dd class="description">{data.description}</dd>
			{/if}

			{#if data.tags && data.tags.length > 0}
				<dt>tags</dt>
				<dd class="tags">
					{#each data.tags as tag (tag)}
						<span class="tag">{tag}</span>
					{/each}
				</dd>
			{/if}
		</dl>
	{/if}

	<button onclick={() => (showRaw = !showRaw)}>
		{showRaw ? 'formatted view' : 'raw json'}
	</button>
{:else}
	<p>No YouTube data available</p>
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

	img {
		max-width: 320px;
		height: auto;
		border-radius: var(--border-radius);
	}

	.description {
		white-space: pre-wrap;
		font-size: var(--font-3);
		max-height: 10em;
		overflow-y: auto;
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

	button {
		margin-top: var(--space-3);
	}

	pre {
		font-size: var(--font-3);
		overflow-x: auto;
	}
</style>
