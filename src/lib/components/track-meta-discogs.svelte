<script>
	let {data} = $props()
	let showRaw = $state(false)
</script>

{#if data}
	<button onclick={() => (showRaw = !showRaw)}>
		{showRaw ? 'formatted view' : 'raw json'}
	</button>
	{#if showRaw}
		<pre><code>{JSON.stringify(data, null, 2)}</code></pre>
	{:else}
		<dl class="meta">
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

			{#if data.genres?.length > 0}
				<dt>genres</dt>
				<dd>
					{#each data.genres as genre, i (genre)}
						<a href="/search?search={encodeURIComponent(genre)}">{genre}</a>{i <
						data.genres.length - 1
							? ', '
							: ''}
					{/each}
				</dd>
			{/if}

			{#if data.styles?.length > 0}
				<dt>styles</dt>
				<dd>
					{#each data.styles as style, i (style)}
						<a href="/search?search={encodeURIComponent(style)}">{style}</a>{i <
						data.styles.length - 1
							? ', '
							: ''}
					{/each}
				</dd>
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
{:else}
	<p>No Discogs data available</p>
{/if}
