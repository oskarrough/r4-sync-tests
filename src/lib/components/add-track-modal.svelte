<script>
	import {goto} from '$app/navigation'
	import {appState} from '$lib/app-state.svelte'
	import Icon from '$lib/components/icon.svelte'
	import Modal from '$lib/components/modal.svelte'
	import {tooltip} from './tooltip-attachment'
	import * as m from '$lib/paraglide/messages'

	let showModal = $state(false)
	let recentTracks = $state([])
	let prefilledUrl = $state('')

	export function openWithUrl(url) {
		prefilledUrl = url
		showModal = true
	}

	function handleGlobalModalEvent(event) {
		if (canAddTrack) {
			openWithUrl(event.detail.url)
		} else {
			goto('/auth')
		}
	}

	const channelId = $derived(appState.channels?.length > 0 ? appState.channels[0] : undefined)
	const isSignedIn = $derived(!!appState.user)
	const canAddTrack = $derived(isSignedIn && channelId)

	/** @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (
			event.target?.tagName === 'PGLITE-REPL' ||
			event.target?.tagName === 'INPUT' ||
			event.target?.tagName === 'TEXTAREA'
		)
			return
		if (event.key === 'c' && !event.metaKey && !event.ctrlKey) {
			if (canAddTrack) {
				showModal = true
			} else {
				goto('/auth')
			}
		}
	}

	function handleAddTrackClick() {
		if (canAddTrack) {
			showModal = true
		} else {
			goto('/auth')
		}
	}

	function submit(event) {
		const track = event.detail.data
		recentTracks.unshift(track)
		if (recentTracks.length > 3) recentTracks.pop()
		console.log({track, recentTracks})

		// Clear prefilled URL and close modal
		prefilledUrl = ''
		showModal = false

		// Dispatch event for parent to handle track insertion
		document.dispatchEvent(
			new CustomEvent('r5:trackAdded', {
				detail: {track, channelId}
			})
		)
	}
</script>

<svelte:window onkeydown={handleKeyDown} on:r5:openAddModal={handleGlobalModalEvent} />

<button onclick={handleAddTrackClick} {@attach tooltip({content: m.track_add_title()})}>
	<Icon icon="add" size={20}></Icon>
</button>

<Modal bind:showModal>
	{#snippet header()}
		<h2>{m.track_add_title()}</h2>
	{/snippet}

	<r4-track-create channel_id={channelId} url={prefilledUrl} onsubmit={submit}></r4-track-create>

	{#if recentTracks.length > 0}
		<div class="recent-tracks">
			<h3>{m.track_recently_saved()}</h3>
			{#each recentTracks as track (track.id || track.url)}
				<div>{track.title || track.url}</div>
			{/each}
		</div>
	{/if}
</Modal>

<style>
</style>
