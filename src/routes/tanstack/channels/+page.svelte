<script lang="ts">
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import {channelsCollection, offlineExecutor, createChannelActions} from '../collections'
	import {sdk} from '@radio4000/sdk'
	import SyncStatus from '../sync-status.svelte'

	const slug = 'oskar'
	let status = $state('')
	let userId = $state<string | null>(null)

	// Get current user
	sdk.auth.getUser().then(({data}) => {
		userId = data?.user?.id ?? null
	})

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
		q
			.from({channels: channelsCollection})
			.orderBy(({channels}) => channels.created_at)
			.limit(10)
	)

	const channel = $derived(channelQuery.data?.[0])
	const channelActions = $derived(userId ? createChannelActions(offlineExecutor, userId) : null)

	async function handleCreate(e: SubmitEvent) {
		e.preventDefault()
		if (!channelActions) {
			status = 'Error: Not logged in'
			return
		}
		const form = e.target as HTMLFormElement
		const formData = new FormData(form)
		const name = formData.get('name') as string
		const channelSlug = formData.get('slug') as string

		status = 'Creating...'
		try {
			await channelActions.addChannel({name, slug: channelSlug})
			status = 'Created!'
			form.reset()
		} catch (err) {
			status = `Create failed: ${(err as Error).message}`
		}
	}

	async function handleUpdate(channelId: string, currentName: string) {
		if (!channelActions) return
		const newName = prompt('New name:', currentName)
		if (!newName || newName === currentName) return
		status = 'Updating...'
		try {
			await channelActions.updateChannel({id: channelId, changes: {name: newName}})
			status = 'Updated!'
		} catch (err) {
			status = `Update failed: ${(err as Error).message}`
		}
	}

	async function handleDelete(id: string) {
		if (!channelActions) return
		const ch = channelsCollection.get(id)
		if (!ch || !confirm(`Delete "${ch.name}"? This will also delete all tracks.`)) return
		status = 'Deleting...'
		try {
			await channelActions.deleteChannel(id)
			status = 'Deleted!'
		} catch (err) {
			status = `Delete failed: ${(err as Error).message}`
		}
	}
</script>

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
	<h3>{slug}</h3>
	{#if channelQuery.isLoading}
		<p>Loading…</p>
	{:else if channelQuery.isError}
		<p style="color: var(--red)">{channelQuery.error.message}</p>
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
