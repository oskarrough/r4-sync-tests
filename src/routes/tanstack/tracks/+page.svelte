<script lang="ts">
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import {tracksCollection, offlineExecutor, createTrackActions} from '../collections'
	import {hydrateTracksFromIDB} from '../idb-persistence'
	import SyncStatus from '../sync-status.svelte'
	import {appState} from '$lib/app-state.svelte'

	// Hydrate from IDB on mount
	hydrateTracksFromIDB()

	let error = $state('')

	const userChannel = $derived(appState.channel)
	const slug = $derived(userChannel?.slug)

	const tracksQuery = useLiveQuery((q) =>
		q
			.from({tracks: tracksCollection})
			.where(({tracks}) => eq(tracks.slug, slug ?? ''))
			.orderBy(({tracks}) => tracks.created_at)
			.limit(slug ? 10 : 0)
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
		const track = tracksCollection.get(id)
		if (!track || !confirm(`Delete "${track.title}"?`)) return
		try {
			await trackActions.deleteTrack(id)
			error = ''
		} catch (err) {
			error = (err as Error).message
		}
	}
</script>

<h2>Tracks</h2>

<dl class="meta">
	<dt>Channel</dt>
	<dd>{slug ?? '—'}</dd>
</dl>

<SyncStatus />

{#if !userChannel}
	<p>Sign in to manage tracks</p>
{:else}
	<form onsubmit={handleInsert}>
		<input name="url" value="https://www.youtube.com/watch?v=GGmGMEVbTAY" required />
		<input name="title" placeholder="Title" required />
		<button type="submit">Add</button>
	</form>
{/if}

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
