<script>
	let {data} = $props()
	let showRaw = $state(false)

	function formatLength(ms) {
		if (!ms) return ''
		const seconds = Math.floor(ms / 1000)
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const recording = $derived(data?.recording)
	const firstRelease = $derived(recording?.releases?.[0])
	const artistCredit = $derived(recording?.['artist-credit']?.[0])
</script>

{#if data}
	{#if showRaw}
		<pre><code>{JSON.stringify(data, null, 2)}</code></pre>
	{:else}
		<dl>
			{#if artistCredit?.artist?.name}
				<dt>artist</dt>
				<dd>{artistCredit.artist.name}</dd>
			{/if}

			{#if recording?.title}
				<dt>recording</dt>
				<dd>{recording.title}</dd>
			{/if}

			{#if recording?.length}
				<dt>length</dt>
				<dd>{formatLength(recording.length)}</dd>
			{/if}

			{#if recording?.['first-release-date']}
				<dt>first release</dt>
				<dd>{recording['first-release-date']}</dd>
			{/if}

			{#if firstRelease}
				<dt>appears on</dt>
				<dd>
					{firstRelease.title}
					{#if firstRelease.date}
						({firstRelease.date})
					{/if}
					{#if firstRelease.media?.[0]?.format}
						- {firstRelease.media[0].format}
					{/if}
				</dd>
			{/if}

			{#if recording?.releases?.length > 1}
				<dt>other releases</dt>
				<dd>{recording.releases.length - 1} more</dd>
			{/if}

			{#if recording?.id}
				<dt>musicbrainz</dt>
				<dd>
					<a
						href="https://musicbrainz.org/recording/{recording.id}"
						target="_blank"
						rel="noopener noreferrer"
					>
						view on musicbrainz →
					</a>
				</dd>
			{/if}
		</dl>
	{/if}

	<button onclick={() => (showRaw = !showRaw)}>
		{showRaw ? 'formatted view' : 'raw json'}
	</button>
{:else}
	<p>No MusicBrainz data available</p>
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
