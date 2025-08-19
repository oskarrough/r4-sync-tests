<script>
	import {page} from '$app/state'
	import {appState} from '$lib/app-state.svelte'
	import {toggleQueuePanel} from '$lib/api'

	import AddTrackModal from '$lib/components/add-track-modal.svelte'
	import BroadcastControls from '$lib/components/broadcast-controls.svelte'
	import HeaderSearch from '$lib/components/header-search.svelte'
	import Icon from '$lib/components/icon.svelte'
	import LiveBroadcasts from '$lib/components/live-broadcasts.svelte'
	import TestCounter from '$lib/components/test-counter.svelte'

	const {preloading} = $props()
</script>

<header>
	<a href="/" class:active={page.route.id === '/'}>
		{#if preloading}
			R0
		{:else}
			<TestCounter />
		{/if}
	</a>
	<HeaderSearch />
	<!-- <a href="/playground/spam-warrior" class="btn">Spam Warrior</a> -->

	<menu>
		{#if !preloading}{/if}
	</menu>
	<menu class="row right">
		{#if !preloading}
			<AddTrackModal />
			<BroadcastControls />
			<LiveBroadcasts />
			<hr />
			<a href="/following" class="btn" class:active={page.route.id === '/following'}>
				<Icon icon="favorite" size={20} />
			</a>
			<a href="/stats" class="btn" class:active={page.route.id === '/stats'}>
				<Icon icon="chart-scatter" size={20} />
			</a>
			<!-- <button onclick={toggleChatPanel}>Chat</button> -->
		{/if}
		<a href="/cli" class="btn" class:active={page.route.id === '/cli'}>
			<Icon icon="terminal" size={20} />
		</a>
		<a href="/settings" class="btn" class:active={page.route.id === '/settings'}>
			<Icon icon="settings" size={20} />
		</a>
		<button onclick={toggleQueuePanel} class:active={appState.queue_panel_visible}>
			<Icon icon="sidebar-fill-right" size={20} />
		</button>
	</menu>
</header>

<style>
	header {
		display: flex;
		flex-flow: row wrap;
		place-items: center;
		gap: 0.2rem;
		padding: 0.5rem;
		background: var(--header-bg, var(--bg-2));
		border-bottom: 1px solid var(--gray-7);

		.right {
			margin-left: auto;
		}

		a {
			text-decoration: none;
		}

		:global(.live-broadcasts) {
			margin-right: 0.5rem;
		}
	}
</style>
