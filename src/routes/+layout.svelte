<script>
	import '../styles/style.css'
	import 'leaflet/dist/leaflet.css'
	import {pg} from '$lib/r5/db'
	import LayoutHeader from '$lib/components/layout-header.svelte'
	import LayoutFooter from '$lib/components/layout-footer.svelte'
	import QueuePanel from '$lib/components/queue-panel.svelte'
	import AuthListener from '$lib/components/auth-listener.svelte'
	import LiveChat from '$lib/components/live-chat.svelte'
	import DraggablePanel from '$lib/components/draggable-panel.svelte'
	import KeyboardShortcuts from '$lib/components/keyboard-shortcuts.svelte'
	import {appState, persistAppState} from '$lib/app-state.svelte'
	import '@radio4000/components'
	import {logger} from '$lib/logger'
	import {onMount} from 'svelte'
	import {checkUser} from '$lib/api'
	import {goto} from '$app/navigation'

	const log = logger.ns('layout').seal()

	const {data, children} = $props()

	let skipPersist = $state(true)
	let chatPanelVisible = $state(false)
	const preloading = $derived(data.preloading)

	onMount(async () => {
		await checkUser()
		applyCustomCssVariables()
		// Ensure channels_display has a value before persisting
		if (!appState.channels_display) {
			appState.channels_display = 'grid'
		}
		skipPersist = false
	})

	function applyCustomCssVariables() {
		const root = document.documentElement
		Object.entries(appState.custom_css_variables || {}).forEach(([name, value]) => {
			if (value) root.style.setProperty(name, value)
		})
	}

	$effect(() => {
		if (skipPersist) return
		// Take a snapshot to track all property changes
		$state.snapshot(appState)
		persistAppState()
			.then(() => log.log('persisted app_state'))
			.catch((err) => {
				goto(`/recovery?err=${err.message}`)
			})
	})

	// "Close" the database on page unload. I have not noticed any difference, but seems like a good thing to do.
	$effect(() => {
		const handler = async () => {
			log.log('beforeunload_closing_db')
			// event.preventDefault()
			appState.broadcasting_channel_id = undefined
			appState.is_playing = false
			//await pg.close()
		}
		window.addEventListener('beforeunload', handler)
		return () => window.removeEventListener('beforeunload', handler)
	})
</script>

<svelte:boundary>
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

			<QueuePanel />

			{#if chatPanelVisible}
				<DraggablePanel title="R4 Chat">
					<LiveChat />
				</DraggablePanel>
			{/if}
		</div>

		<LayoutFooter {preloading} />
	</div>
	{#snippet pending()}
		<p>loading...</p>
	{/snippet}
</svelte:boundary>

<style>
	.layout {
		--aside-width: min(60ch, 100%);

		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100vh;
	}

	.content {
		display: grid;
		grid-template-columns: 1fr;
		height: 100%;
		overflow: hidden;
		position: relative;
		> :global(aside) {
			transform: translate3d(100%, 0, 0);
			position: absolute;
			right: 0;
			top: 0;
			bottom: 0;
			width: var(--aside-width);
			transition: transform 100ms ease-in;
		}
	}

	.asideVisible .content {
		grid-template-columns: 1fr var(--aside-width);
		> :global(aside) {
			display: flex;
			transform: translate3d(0, 0, 0);
			transition-duration: 200ms;
			transition-timing-function: ease-out;
		}
	}

	.scroll {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}
</style>
