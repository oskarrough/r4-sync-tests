<script lang="ts">
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import {channelsCollection, tracksCollection, offlineExecutor, createTrackActions} from '../collections'
	import SyncStatus from '../sync-status.svelte'
	import {appState} from '$lib/app-state.svelte'

	let status = $state('')

	// Get user's channel from appState
	const userChannelId = $derived(appState.channels?.[0])
	const userChannel = $derived(userChannelId ? channelsCollection.state.data?.find((c) => c.id === userChannelId) : null)
	const slug = $derived(userChannel?.slug)

	$inspect({userChannelId, userChannel, collectionData: channelsCollection.state.data})

	const tracksQuery = useLiveQuery((q) =>
		q
			.from({tracks: tracksCollection})
			.where(({tracks}) => eq(tracks.slug, slug ?? ''))
			.orderBy(({tracks}) => tracks.created_at)
			.limit(5)
	)

	// Create actions when channel is loaded
	const trackActions = $derived(userChannel ? createTrackActions(offlineExecutor, userChannel.id, userChannel.slug) : null)

	async function handleInsert(e: SubmitEvent) {
		e.preventDefault()
		if (!trackActions) {
			status = 'Error: No channel loaded'
			return
		}
		const form = e.target as HTMLFormElement
		const formData = new FormData(form)
		const url = formData.get('url') as string
		const title = formData.get('title') as string

		status = 'Inserting...'
		try {
			await trackActions.addTrack({url, title})
			status = 'Inserted!'
			form.reset()
		} catch (err) {
			status = `Insert failed: ${err.message}`
		}
	}

	async function handleUpdate(trackId: string, currentTitle: string) {
		if (!trackActions) return
		const newTitle = prompt('New title:', currentTitle)
		if (!newTitle || newTitle === currentTitle) return
		status = 'Updating...'
		try {
			await trackActions.updateTrack({id: trackId, changes: {title: newTitle}})
			status = 'Updated!'
		} catch (err) {
			status = `Update failed: ${err.message}`
		}
	}

	async function handleDelete(id: string) {
		if (!trackActions) return
		const track = tracksCollection.get(id)
		if (!track || !confirm(`Delete "${track.title}"?`)) return
		status = 'Deleting...'
		try {
			await trackActions.deleteTrack(id)
			status = 'Deleted!'
		} catch (err) {
			status = `Delete failed: ${err.message}`
		}
	}
</script>

<h2>Tracks Collection Test</h2>
<p>Testing <code>tracksCollection</code> for <code>{slug ?? 'no channel'}</code></p>
{#if !userChannel}<p><em>Sign in and load your channel to test mutations</em></p>{/if}

<SyncStatus />

{#if status}<p><strong>{status}</strong></p>{/if}

<section>
	<h3>Insert</h3>
	<form onsubmit={handleInsert}>
		<input name="url" value="https://www.youtube.com/watch?v=GGmGMEVbTAY" required />
		<input name="title" placeholder="Title" required />
		<button type="submit" disabled={!trackActions}>Add track</button>
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
					<button onclick={() => handleDelete(track.id)}>delete</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
