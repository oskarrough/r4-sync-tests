<script>
	import {appState} from '$lib/app-state.svelte'
	import Modal from '$lib/components/modal.svelte'
	import * as m from '$lib/paraglide/messages'

	let showModal = $state(false)
	let currentTrack = $state(null)
	let currentChannel = $state(null)

	/** @param {object} track
	 *  @param {{id: string, slug: string}} [channel] - optional, defaults to appState.channel */
	export function openWithTrack(track, channel) {
		currentTrack = track
		currentChannel = channel || appState.channel
		showModal = true
	}

	function handleSubmit(event) {
		const {data, error} = event.detail
		if (error) return

		showModal = false

		document.dispatchEvent(
			new CustomEvent('r5:trackUpdated', {
				detail: {trackId: currentTrack?.id}
			})
		)
	}
</script>

<Modal bind:showModal>
	{#snippet header()}
		<h2>{m.track_edit_title()}</h2>
	{/snippet}

	{#key currentTrack?.id}
		<r4-track-update
			id={currentTrack?.id}
			url={currentTrack?.url}
			title={currentTrack?.title}
			description={currentTrack?.description}
			discogs_url={currentTrack?.discogs_url}
			onsubmit={handleSubmit}
		></r4-track-update>
	{/key}
</Modal>
