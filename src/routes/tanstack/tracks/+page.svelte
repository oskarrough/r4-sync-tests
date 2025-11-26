<script lang="ts">
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import {channelsCollection, tracksCollection} from '../collections'

	const slug = 'oskar'
	let status = $state('')

	const tracksQuery = useLiveQuery((q) =>
		q
			.from({tracks: tracksCollection})
			.where(({tracks}) => eq(tracks.slug, slug))
			.orderBy(({tracks}) => tracks.created_at)
			.limit(5)
	)

	// Need channel ID for inserts
	const channelsQuery = useLiveQuery((q) =>
		q
			.from({channels: channelsCollection})
			.where(({channels}) => eq(channels.slug, slug))
			.orderBy(({channels}) => channels.created_at)
			.limit(1)
	)
	const channelId = $derived(channelsQuery.data?.[0]?.id)

	async function handleInsert(e: SubmitEvent) {
		e.preventDefault()
		const form = e.target as HTMLFormElement
		const formData = new FormData(form)
		const track = {
			id: crypto.randomUUID(),
			url: formData.get('url') as string,
			title: formData.get('title') as string,
		}
		if (!channelId) {
			status = 'Error: No channel loaded'
			return
		}
		status = 'Inserting...'
		const tx = tracksCollection.insert(track, {metadata: {channel_id: channelId}})
		try {
			await tx.isPersisted.promise
			status = 'Inserted!'
			form.reset()
		} catch (err) {
			status = `Insert failed: ${err.message}`
		}
	}

	async function handleUpdate(trackId: string, currentTitle: string) {
		const newTitle = prompt('New title:', currentTitle)
		if (!newTitle || newTitle === currentTitle) return
		status = 'Updating...'
		const tx = tracksCollection.update(trackId, (draft) => {
			draft.title = newTitle
		})
		try {
			await tx.isPersisted.promise
			status = 'Updated!'
		} catch (err) {
			status = `Update failed: ${err.message}`
		}
	}

	async function handleDelete(trackId: string, title: string) {
		if (!confirm(`Delete "${title}"?`)) return
		status = 'Deleting...'
		const tx = tracksCollection.delete(trackId)
		try {
			await tx.isPersisted.promise
			status = 'Deleted!'
		} catch (err) {
			status = `Delete failed: ${err.message}`
		}
	}
</script>

<h2>Tracks Collection Test</h2>
<p>Testing <code>tracksCollection</code> for <code>{slug}</code></p>

{#if status}<p><strong>{status}</strong></p>{/if}

<section>
	<h3>Insert</h3>
	<form onsubmit={handleInsert}>
		<input name="url" value="https://www.youtube.com/watch?v=GGmGMEVbTAY" required />
		<input name="title" placeholder="Title" required />
		<button type="submit" disabled={!channelId}>Add track</button>
	</form>

	<h3>Tracks ({tracksQuery.data?.length ?? 0})</h3>
	{#if tracksQuery.isLoading}
		<p>Loading...</p>
	{:else if tracksQuery.isError}
		<p style="color: red;">Error: {tracksQuery.error.message}</p>
	{:else if tracksQuery.isReady}
		<ul>
			{#each tracksQuery.data as track (track.id)}
				<li>
					<code>{track.id.slice(0, 8)}</code>
					{track.title}
					<button onclick={() => handleUpdate(track.id, track.title)}>edit</button>
					<button onclick={() => handleDelete(track.id, track.title)}>delete</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
