<script>
	import Modal from '$lib/components/modal.svelte'
	import Icon from '$lib/components/icon.svelte'
	import AuthGate from '$lib/components/auth-gate.svelte'
	import {appState} from '$lib/app-state.svelte'
	import {pg} from '$lib/r5/db'
	import {r5} from '$lib/r5'
	import {tooltip} from '$lib/components/tooltip-attachment.js'
	import {goto} from '$app/navigation'

	let showModal = $state(false)
	let recentTracks = $state([])

	const channelId = $derived(appState.channels?.length > 0 ? appState.channels[0] : undefined)
	const isSignedIn = $derived(!!appState.user)
	const canAddTrack = $derived(isSignedIn && channelId)

	const channel = $derived.by(async () => {
		return (await pg.sql`select * from channels where id = ${channelId}`).rows[0]
	})

	/** @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (event.target?.tagName === 'PGLITE-REPL' || event.target?.tagName === 'INPUT') return
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

	async function submit(event) {
		const track = event.detail.data
		recentTracks.unshift(track)
		if (recentTracks.length > 3) recentTracks.pop()
		console.log({track, recentTracks})

		// Insert track into local db using r5.tracks.insert
		try {
			const channelData = await channel
			if (channelData) {
				await r5.tracks.insert(channelData.slug, [track])
			}
		} catch (error) {
			console.error('Failed to insert track:', error)
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<button onclick={handleAddTrackClick} {@attach tooltip({content: 'Add track'})}>
	<Icon icon="add" size={20}></Icon>
</button>

<Modal bind:showModal>
	{#snippet header()}
		<h2>
			Add track
			{#await channel then channelData}
				{#if channelData}
					to <a href={`/${channelData.slug}`}>{channelData.name}</a>
				{/if}
			{/await}
		</h2>
	{/snippet}

	<AuthGate>
		<r4-track-create channel_id={channelId} onsubmit={submit}></r4-track-create>

		{#if recentTracks.length > 0}
			<div class="recent-tracks">
				<h3>Recently saved:</h3>
				{#each recentTracks as track (track.id || track.url)}
					<div>{track.title || track.url}</div>
				{/each}
			</div>
		{/if}
	</AuthGate>
</Modal>

<style>
</style>
