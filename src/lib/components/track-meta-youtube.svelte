<script>
	import {relativeDateDetailed} from '$lib/dates.js'

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
			{#if data.duration}
				<dt>duration</dt>
				<dd>{formatDuration(data.duration)}</dd>
			{/if}

			{#if data.publishedAt}
				<dt>published</dt>
				<dd>{relativeDateDetailed(data.publishedAt)}</dd>
			{/if}

			{#if data.channelTitle}
				<dt>channel</dt>
				<dd>
					<a href="/search?search={encodeURIComponent(data.channelTitle)}">{data.channelTitle}</a>
				</dd>
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
						<a href="/search?search={encodeURIComponent('#' + tag)}" class="tag">{tag}</a>
					{/each}
				</dd>
			{/if}
		</dl>
	{/if}
{:else}
	<p>No YouTube data available</p>
{/if}
