<script lang="ts">
	import Menu from '../menu.svelte'
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import {channelsCollection, offlineExecutor} from '../collections'
	// import {sdk} from '@radio4000/sdk'
	import SyncStatus from '../sync-status.svelte'

	const slug = 'oskar'
	let status = $state('')
	let userId = $state<string | null>(null)

	const singleChannelQuery = useLiveQuery((q) =>
		q.from({channels: channelsCollection}).where(({channels}) => eq(channels.slug, slug))
	)

	const allChannelsQuery = useLiveQuery((q) =>
		q
			.from({channels: channelsCollection})
			.orderBy(({channels}) => channels.created_at)
			.limit(10)
	)

	const channel = $derived(singleChannelQuery.data?.[0])

	async function handleCreate(e: SubmitEvent) {
		e.preventDefault()
		console.log('todo')
	}

	async function handleUpdate(channelId: string, currentName: string) {
		console.log('todo')
	}

	async function handleDelete(id: string) {
		console.log('todo')
	}
</script>

<Menu />

<h2>Channels</h2>

<SyncStatus />

{#if !userId}
	<p>Sign in to manage channels</p>
{:else}
	<form onsubmit={handleCreate}>
		<input name="name" placeholder="Channel name" required />
		<input name="slug" placeholder="channel-slug" required pattern="[a-z0-9-]+" />
		<button type="submit">Create</button>
	</form>
{/if}

{#if status}<p><strong>{status}</strong></p>{/if}

<section>
	<h3>Single channel query: {slug}</h3>
	{#if singleChannelQuery.isLoading}
		<p>Loading…</p>
	{:else if singleChannelQuery.isError}
		<p style="color: var(--red)">{singleChannelQuery.error.message}</p>
	{:else if channel}
		<dl class="meta">
			<dt>Name</dt>
			<dd>{channel.name}</dd>
			<dt>Description</dt>
			<dd>{channel.description || '—'}</dd>
		</dl>
	{:else}
		<p>Not found</p>
	{/if}
</section>

<section>
	<h3>All channels</h3>
	{#if allChannelsQuery.isLoading}
		<p>Loading…</p>
	{:else if allChannelsQuery.isError}
		<p style="color: var(--red)">{allChannelsQuery.error.message}</p>
	{:else if allChannelsQuery.data?.length}
		<ul>
			{#each allChannelsQuery.data as ch (ch.id)}
				<li>
					{ch.slug} — {ch.name}
					{#if channelActions}
						<button onclick={() => handleUpdate(ch.id, ch.name)}>edit</button>
						<button onclick={() => handleDelete(ch.id)}>×</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
