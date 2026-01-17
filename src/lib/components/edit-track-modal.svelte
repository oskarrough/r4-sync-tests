<script>
	import {appState} from '$lib/app-state.svelte'
	import Modal from '$lib/components/modal.svelte'
	import TrackForm from '$lib/components/track-form.svelte'
	import * as m from '$lib/paraglide/messages'

	let showModal = $state(false)

	/** @type {import('$lib/types').Track | null} */
	let track = $state(null)

	/** @param {{track: import('$lib/types').Track}} data */
	function open(data) {
		track = data.track
		showModal = true
	}

	$effect(() => {
		if (appState.modal_track_edit) {
			open(appState.modal_track_edit)
			appState.modal_track_edit = null
		}
	})

	function handleSubmit(event) {
		if (event.error) return
		showModal = false
		document.dispatchEvent(
			new CustomEvent('r5:trackUpdated', {
				detail: {trackId: track?.id}
			})
		)
	}
</script>

<Modal bind:showModal>
	{#snippet header()}
		<h2>{m.track_edit_title()}</h2>
	{/snippet}

	{#if showModal && track && track.channel_id && track.slug}
		<TrackForm
			mode="edit"
			channel={{id: track.channel_id, slug: track.slug}}
			trackId={track.id}
			url={track.url}
			title={track.title}
			description={track.description ?? undefined}
			discogs_url={track.discogs_url ?? undefined}
			onsubmit={handleSubmit}
		/>
	{/if}
</Modal>
