<script>
	import {pg} from '$lib/r5/db'

	let {track} = $props()
	let relatedTracks = $state([])

	// Find other tracks with same ytid
	$effect(async () => {
		if (!track?.url) return
		const result = await pg.sql`
			SELECT * FROM tracks_with_meta
			WHERE ytid(url) = ytid(${track.url})
			AND id != ${track.id}
			ORDER BY created_at DESC
		`
		relatedTracks = result.rows
	})
</script>

{#if relatedTracks.length > 0}
	<p>Other tracks using the same YouTube video:</p>
	<dl>
		{#each relatedTracks as related (related.id)}
			<dt>
				<a href="/{related.channel_slug}/tracks/{related.id}">
					{related.title}
				</a>
			</dt>
			<dd>
				by <a href="/{related.channel_slug}">@{related.channel_slug}</a>
			</dd>
		{/each}
	</dl>
{:else}
	<p>No other tracks use this YouTube video.</p>
{/if}

<style>
	a {
		color: var(--color-accent);
	}
</style>
