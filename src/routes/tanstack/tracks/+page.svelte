<script lang="ts">
	import Menu from '../menu.svelte'
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import {tracksCollection, offlineExecutor, createTrackActions} from '../collections'
	import {hydrateTracksFromIDB} from '../idb-persistence'
	import SyncStatus from '../sync-status.svelte'
	import {appState} from '$lib/app-state.svelte'

	// hydrateTracksFromIDB()

	let error = $state('')

	const userChannel = $derived(appState.channel)

	const tracksQuery = useLiveQuery((q) =>
		q
			.from({tracks: tracksCollection})
			.where(({tracks}) => eq(tracks.slug, userChannel?.slug || ''))
			.orderBy(({tracks}) => tracks.created_at)
			.limit(20)
	)

	const trackActions = $derived(
		userChannel ? createTrackActions(offlineExecutor, userChannel.id, userChannel.slug) : null
	)

	async function handleInsert(e: SubmitEvent) {
		e.preventDefault()
		if (!trackActions) return
		const form = e.target as HTMLFormElement
		const formData = new FormData(form)
		try {
			await trackActions.addTrack({
				url: formData.get('url') as string,
				title: formData.get('title') as string
			})
			form.reset()
			error = ''
		} catch (err) {
			error = (err as Error).message
		}
	}

	async function handleUpdate(trackId: string, currentTitle: string) {
		if (!trackActions) return
		const newTitle = prompt('New title:', currentTitle)
		if (!newTitle || newTitle === currentTitle) return
		try {
			await trackActions.updateTrack({id: trackId, changes: {title: newTitle}})
			error = ''
		} catch (err) {
			error = (err as Error).message
		}
	}

	async function handleDelete(id: string) {
		if (!trackActions) return
		try {
			await trackActions.deleteTrack(id)
			error = ''
		} catch (err) {
			error = (err as Error).message
		}
	}
</script>

<Menu />

{#if !userChannel}
	<p>Sign in to manage tracks</p>
{:else}
	<p>Add track to {appState.channel.slug}</p>
	<form onsubmit={handleInsert}>
		<input name="url" value="https://www.youtube.com/watch?v=GGmGMEVbTAY" required />
		<input name="title" placeholder="Title" required />
		<button type="submit">Add</button>
	</form>
{/if}

<h2>Latest 20 tracks</h2>
{#if error}<p style="color: var(--red)">{error}</p>{/if}
{#if tracksQuery.isLoading}
	<p>Loading…</p>
{:else if tracksQuery.isError}
	<p style="color: var(--red)">{tracksQuery.error.message}</p>
{:else if tracksQuery.data?.length}
	<ul>
		{#each tracksQuery.data as track (track.id)}
			<li>
				{track.title}
				<button onclick={() => handleUpdate(track.id, track.title)}>edit</button>
				<button onclick={() => handleDelete(track.id)}>×</button>
			</li>
		{/each}
	</ul>
{/if}

<SyncStatus />
