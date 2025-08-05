<script>
	import '../styles/style.css'
	import 'leaflet/dist/leaflet.css'
	import {pg} from '$lib/db'
	import {stopBroadcasting} from '$lib/broadcast'
	import LayoutHeader from '$lib/components/layout-header.svelte'
	import LayoutFooter from '$lib/components/layout-footer.svelte'
	import QueuePanel from '$lib/components/queue-panel.svelte'
	import AuthListener from '$lib/components/auth-listener.svelte'
	import LiveChat from '$lib/components/live-chat.svelte'
	import DraggablePanel from '$lib/components/draggable-panel.svelte'
	import KeyboardShortcuts from '$lib/components/keyboard-shortcuts.svelte'
	import {appState, initAppState, persistAppState} from '$lib/app-state.svelte'
	import '@radio4000/components'
	import {logger} from '$lib/logger'
	import {onMount, untrack} from 'svelte'
	import {checkUser} from '$lib/api'

	const log = logger.ns('layout').seal()

	const {data, children} = $props()

	let skipPersist = $state(true)
	let chatPanelVisible = $state(false)
	const preloading = $derived(data.preloading)

	onMount(async () => {
		await initAppState()
		await checkUser()
		skipPersist = false
	})

	$effect(() => {
		if (skipPersist) return
		// Take a snapshot to track all property changes
		$state.snapshot(appState)
		// Use untrack to prevent the persistence from causing reactivity loops
		untrack(() => {
			persistAppState()
				.then(() => console.log('persisted'))
				.catch((err) => {
					console.error('Failed to persist app state from effect:', err)
				})
		})
	})

	// "Close" the database on page unload. I have not noticed any difference, but seems like a good thing to do.
	$effect(() => {
		const handler = async () => {
			log.log('beforeunload_closing_db')
			// event.preventDefault()
			stopBroadcasting()
			appState.is_playing = false
			await pg.close()
		}
		window.addEventListener('beforeunload', handler)
		return () => window.removeEventListener('beforeunload', handler)
	})
</script>

<AuthListener />
<KeyboardShortcuts />

<div class={['layout', {asideVisible: appState.queue_panel_visible}]}>
	<LayoutHeader {preloading} />

	<div class="content">
		<main class="scroll">
			{#if preloading}
				<center>
					<p>Preparing R4&hellip;</p>
				</center>
			{:else}
				{@render children()}
			{/if}
		</main>

		{#if appState.queue_panel_visible}
			<QueuePanel />
		{/if}

		{#if chatPanelVisible}
			<DraggablePanel title="R4 Chat">
				<LiveChat />
			</DraggablePanel>
		{/if}
	</div>

	<LayoutFooter {preloading} />
</div>

<style>
	.layout {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100vh;
	}

	.content {
		display: grid;
		grid-template-columns: 1fr;
		height: 100%;
		overflow: hidden;
	}

	.asideVisible .content {
		grid-template-columns: 1fr minmax(460px, 25vw);
		> :global(aside) {
			display: flex;
		}
	}

	.content > :global(aside) {
		display: none;
	}

	.scroll {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}

	@media (max-width: 768px) {
		.content {
			grid-template-columns: 1fr;
		}
	}
</style>
