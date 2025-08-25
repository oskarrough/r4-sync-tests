<script>
	import {relativeDate} from '$lib/dates.js'

	let {data} = $props()
	let showRaw = $state(false)

	function formatDuration(seconds) {
		if (!seconds) return ''
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}
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
						<span>#{tag}</span>
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
				<dd>
					<a href={data.discogs_url} target="_blank" rel="noopener noreferrer">view release</a>
				</dd>
			{/if}

			<dt>metadata</dt>
			<dd>
				{#if data.has_youtube_meta}✓ youtube{/if}
				{#if data.has_musicbrainz_meta}✓ musicbrainz{/if}
				{#if data.has_discogs_meta}✓ discogs{/if}
			</dd>

			{#if data.created_at}
				<dt>added</dt>
				<dd>{relativeDate(data.created_at)}</dd>
			{/if}

			{#if data.updated_at && data.updated_at !== data.created_at}
				<dt>updated</dt>
				<dd>{relativeDate(data.updated_at)}</dd>
			{/if}
		</dl>
	{/if}
{:else}
	<p>No track data available</p>
{/if}
