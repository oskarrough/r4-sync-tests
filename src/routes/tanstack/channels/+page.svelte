<script lang="ts">
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import {channelsCollection} from '../collections'

	const slug = 'oskar'

	// Single channel query
	const channelQuery = useLiveQuery((q) =>
		q
			.from({channels: channelsCollection})
			.where(({channels}) => eq(channels.slug, slug))
			.orderBy(({channels}) => channels.created_at)
			.limit(1)
	)

	// All channels query (no filter)
	const allChannelsQuery = useLiveQuery((q) =>
		q.from({channels: channelsCollection}).orderBy(({channels}) => channels.created_at).limit(10)
	)

	const channel = $derived(channelQuery.data?.[0])
</script>

<h2>Channels Collection Test</h2>
<p>Testing <code>channelsCollection</code></p>

<section>
	<h3>Single Channel: <code>{slug}</code></h3>
	{#if channelQuery.isLoading}
		<p>Loading...</p>
	{:else if channelQuery.isError}
		<p style="color: red;">Error: {channelQuery.error.message}</p>
	{:else if channel}
		<dl>
			<dt>ID</dt>
			<dd><code>{channel.id}</code></dd>
			<dt>Name</dt>
			<dd>{channel.name}</dd>
			<dt>Slug</dt>
			<dd>{channel.slug}</dd>
			<dt>Description</dt>
			<dd>{channel.description || '(none)'}</dd>
		</dl>
	{:else}
		<p>No channel found</p>
	{/if}
</section>

<section>
	<h3>All Channels ({allChannelsQuery.data?.length ?? 0})</h3>
	{#if allChannelsQuery.isLoading}
		<p>Loading...</p>
	{:else if allChannelsQuery.isError}
		<p style="color: red;">Error: {allChannelsQuery.error.message}</p>
	{:else if allChannelsQuery.isReady}
		<ul>
			{#each allChannelsQuery.data as ch (ch.id)}
				<li>
					<code>{ch.slug}</code> — {ch.name}
				</li>
			{/each}
		</ul>
	{/if}
</section>
