<script>
	import {pg} from '$lib/r5/db'
	import * as m from '$lib/paraglide/messages'

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
	<p>{m.track_related_heading()}</p>
	<dl>
		{#each relatedTracks as related (related.id)}
			<dt>
				<a href="/{related.channel_slug}/tracks/{related.id}">
					{related.title}
				</a>
			</dt>
			<dd>
				{m.track_related_by()} <a href="/{related.channel_slug}">@{related.channel_slug}</a>
			</dd>
		{/each}
	</dl>
{:else}
	<p>{m.track_related_empty()}</p>
{/if}

<style>
	a {
		color: var(--accent-9);
	}
</style>
