<script>
	import Modal from '$lib/components/modal.svelte'
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
		/** @param {Event} event */
		const handler = (event) => open(/** @type {CustomEvent} */ (event).detail)
		window.addEventListener('r5:openTrackEditModal', handler)
		return () => window.removeEventListener('r5:openTrackEditModal', handler)
	})

	function handleSubmit(event) {
		if (event.detail?.error) return
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

	{#key track?.id}
		<r4-track-update
			id={track?.id}
			url={track?.url}
			title={track?.title}
			description={track?.description}
			discogs_url={track?.discogs_url}
			onsubmit={handleSubmit}
		></r4-track-update>
	{/key}
</Modal>
