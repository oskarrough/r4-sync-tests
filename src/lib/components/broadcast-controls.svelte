<script>
	import {appState} from '$lib/app-state.svelte'
	import {startBroadcast, stopBroadcast} from '$lib/broadcast'
	import Icon from '$lib/components/icon.svelte'
	import * as m from '$lib/paraglide/messages'

	const userChannelId = $derived(appState?.channels?.[0])

	async function stopBroadcasting() {
		if (userChannelId) {
			await stopBroadcast(userChannelId)
		}
		appState.broadcasting_channel_id = undefined
	}

	async function start() {
		if (!appState.playlist_track) {
			alert(m.broadcast_requires_track())
		} else {
			/** @type {HTMLElement & {paused: boolean, play(): void} | null} */
			const player = document.querySelector('youtube-video')
			if (player?.paused) player.play()

			if (userChannelId && appState.playlist_track) {
				await startBroadcast(userChannelId, appState.playlist_track)
				appState.broadcasting_channel_id = userChannelId
			}
		}
	}
</script>

{#if userChannelId}
	{#if appState.broadcasting_channel_id}
		<button onclick={() => stopBroadcasting()}>{m.broadcast_stop_button()}</button>
	{:else}
		<button onclick={start}>
			<Icon icon="signal" size={20} strokeWidth={1.7}></Icon> {m.broadcast_start_button()}
		</button>
	{/if}
{:else}
	<a class="btn" href="/auth">
		<Icon icon="signal" size={20} strokeWidth={1.7}></Icon> {m.broadcast_login_prompt()}
	</a>
{/if}
