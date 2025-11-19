<script lang="ts">
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import {channelsCollection, tracksCollection} from './collections'

	const testQuery = useLiveQuery((q) =>
		q
			.from({tracks: tracksCollection})
			.where(({tracks}) => eq(tracks.slug, 'ko002'))
			.orderBy(({tracks}) => tracks.created_at)
			.limit(3)
	)

	const testQuery2 = useLiveQuery((q) =>
		q
			.from({tracks: tracksCollection})
			.where(({tracks}) => eq(tracks.slug, 'oskar'))
			.orderBy(({tracks}) => tracks.created_at)
			.limit(3)
	)

	const channelsQuery = useLiveQuery((q) =>
		q
			.from({channels: channelsCollection})
			// .where(({channels}) => eq(channels.slug, 'oskar'))
			.orderBy(({channels}) => channels.created_at)
			.limit(4)
	)
</script>

<p>Testing on-demand sync with two channels.</p>

{#snippet queryTemplate(q)}
	{#if q.isLoading}
		<p>Loading...</p>
	{:else if q.isError}
		<p style="color: red;">Error: {q.error.message}</p>
	{:else if q.isReady}
		<p>Success</p>
		<ul>
			{#each q.data as track (track.id)}
				<li>{track.title}</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<section>
	{@render queryTemplate(testQuery)}
	{@render queryTemplate(testQuery2)}

	{#if channelsQuery.isLoading}
		<p>Loading...</p>
	{:else if channelsQuery.isError}
	<p style="color: red;">Error: {channelsQuery.error.message}</p>
	{:else if channelsQuery.isReady}
		<p>Success</p>
		<ul>
			{#each channelsQuery.data as channel (channel.id)}
				<li>{channel.name}</li>
			{/each}
		</ul>
	{/if}
</section>
