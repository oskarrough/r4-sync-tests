<script>
	import {getPg} from '$lib/r5/db'
	import {logger} from '$lib/logger'
	import Modal from '$lib/components/modal.svelte'

	const log = logger.ns('edit_track_modal').seal()

	let showModal = $state(false)
	let currentTrack = $state(null)
	let showDeleteConfirm = $state(false)

	let editData = $state({
		title: '',
		description: '',
		url: ''
	})

	export function openWithTrack(track) {
		currentTrack = track
		editData.title = track.title || ''
		editData.description = track.description || ''
		editData.url = track.url || ''
		showDeleteConfirm = false
		showModal = true
	}

	$effect(() => {
		if (showModal && currentTrack) {
			// Wait for component to render, then populate fields
			requestAnimationFrame(() => {
				const updateComponent = document.querySelector('r4-track-update')
				if (updateComponent) {
					updateComponent.setAttribute('id', currentTrack.id)
					updateComponent.setAttribute('track_id', currentTrack.id)
					updateComponent.setAttribute('title', editData.title)
					updateComponent.setAttribute('description', editData.description)
					updateComponent.setAttribute('url', editData.url)
				}
			})
		}
	})

	async function handleUpdate(event) {
		const updatedTrack = event.detail.data
		log.info('track updated remotely', {trackId: updatedTrack.id})

		// Optimistic local update
		try {
			const pg = await getPg()
			if (pg) {
				await pg.sql`
					UPDATE tracks
					SET
						title = ${editData.title},
						description = ${editData.description},
						url = ${editData.url}
					WHERE id = ${currentTrack.id}
				`
				log.info('track updated locally', {trackId: currentTrack.id})
			}
		} catch (error) {
			log.error('local update failed', {trackId: currentTrack.id, error})
		}

		// Update the track object
		currentTrack.title = editData.title
		currentTrack.description = editData.description
		currentTrack.url = editData.url

		// Dispatch event for parent to handle track update
		document.dispatchEvent(
			new CustomEvent('r5:trackUpdated', {
				detail: {track: currentTrack}
			})
		)

		showModal = false
	}

	async function handleDelete(event) {
		const deletedTrack = event.detail.data || currentTrack
		log.info('track deleted remotely', {trackId: deletedTrack?.id})

		// Optimistic local deletion
		try {
			const pg = await getPg()
			if (pg) {
				await pg.sql`
					DELETE FROM tracks
					WHERE id = ${currentTrack.id}
				`
				log.info('track deleted locally', {trackId: currentTrack?.id})
			}
		} catch (error) {
			log.error('local delete failed', {trackId: currentTrack?.id, error})
		}

		// Dispatch event for parent to handle track deletion
		document.dispatchEvent(
			new CustomEvent('r5:trackDeleted', {
				detail: {track: currentTrack}
			})
		)

		showModal = false
	}
</script>

<Modal bind:showModal>
	{#snippet header()}
		<h2>Edit track</h2>
	{/snippet}

	{#if showDeleteConfirm}
		<div class="delete-confirm">
			<p>Are you sure you want to delete "{currentTrack?.title}"?</p>
			<r4-track-delete id={currentTrack?.id} track_id={currentTrack?.id} onsubmit={handleDelete}></r4-track-delete>
			<button type="button" onclick={() => (showDeleteConfirm = false)}> Cancel </button>
		</div>
	{:else}
		{#key currentTrack?.id}
			<r4-track-update
				id={currentTrack?.id}
				track_id={currentTrack?.id}
				title={editData.title}
				description={editData.description}
				url={editData.url}
				onsubmit={handleUpdate}
			></r4-track-update>
		{/key}
		<menu>
			<button type="button" onclick={() => (showModal = false)}> Cancel </button>
			<button type="button" class="danger" onclick={() => (showDeleteConfirm = true)}> Delete </button>
		</menu>
	{/if}
</Modal>
