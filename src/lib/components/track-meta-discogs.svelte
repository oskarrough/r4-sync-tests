<script>
	let {data} = $props()
	let showRaw = $state(false)

	// Find the specific track in the tracklist
	const trackInfo = $derived.by(() => {
		if (!data?.tracklist) return null
		// Try to find by matching artist and title from the track context
		// This would need to be passed in or matched somehow
		return data.tracklist.find((t) => t.title === 'So Fine')
	})
</script>

{#if data}
	{#if showRaw}
		<pre><code>{JSON.stringify(data, null, 2)}</code></pre>
	{:else}
		<dl>
			{#if data.title}
				<dt>release</dt>
				<dd>{data.title}</dd>
			{/if}

			{#if data.year || data.released}
				<dt>year</dt>
				<dd>{data.year || data.released}</dd>
			{/if}

			{#if data.labels?.[0]}
				<dt>label</dt>
				<dd>
					{data.labels[0].name}
					{#if data.labels[0].catno}
						- {data.labels[0].catno}
					{/if}
				</dd>
			{/if}

			{#if data.formats?.[0]}
				<dt>format</dt>
				<dd>
					{data.formats[0].name}
					{#if data.formats[0].descriptions?.length > 0}
						({data.formats[0].descriptions.join(', ')})
					{/if}
				</dd>
			{/if}

			{#if trackInfo}
				<dt>track</dt>
				<dd>
					{trackInfo.position}. {trackInfo.title}
					{#if trackInfo.duration}
						({trackInfo.duration})
					{/if}
				</dd>
			{/if}

			{#if data.genres?.length > 0}
				<dt>genres</dt>
				<dd>{data.genres.join(', ')}</dd>
			{/if}

			{#if data.styles?.length > 0}
				<dt>styles</dt>
				<dd>{data.styles.join(', ')}</dd>
			{/if}

			{#if data.country}
				<dt>country</dt>
				<dd>{data.country}</dd>
			{/if}

			{#if data.thumb}
				<dt>cover</dt>
				<dd>
					<img src={data.thumb} alt="Album cover" loading="lazy" />
				</dd>
			{/if}

			{#if data.uri}
				<dt>discogs</dt>
				<dd>
					<a href={data.uri} target="_blank" rel="noopener noreferrer"> view on discogs → </a>
				</dd>
			{/if}
		</dl>
	{/if}

	<button onclick={() => (showRaw = !showRaw)}>
		{showRaw ? 'formatted view' : 'raw json'}
	</button>
{:else}
	<p>No Discogs data available</p>
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
		max-width: 150px;
		height: auto;
		border-radius: var(--border-radius);
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
