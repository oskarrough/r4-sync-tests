<script>
	import {page} from '$app/state'
	import {appState} from '$lib/app-state.svelte'
	import {toggleQueuePanel} from '$lib/api'
	import AddTrackModal from '$lib/components/add-track-modal.svelte'
	import HeaderSearch from '$lib/components/header-search.svelte'
	import Icon from '$lib/components/icon.svelte'
	import TestCounter from '$lib/components/test-counter.svelte'
	import {tooltip} from '$lib/components/tooltip-attachment.js'

	const {preloading} = $props()
</script>

<header>
	<a href="/" class:active={page.route.id === '/'}>
		{#await preloading}
			R0
		{:then}
			<TestCounter />
		{/await}
	</a>
	<HeaderSearch />
	<!-- <a href="/playground/spam-warrior" class="btn">Spam Warrior</a> -->

	<menu class="row right">
		{#await preloading then}
			<AddTrackModal />
			<hr />
			<a
				href="/broadcasts"
				class="btn"
				class:active={page.route.id === '/broadcasts'}
				{@attach tooltip({content: 'Broadcasts'})}
			>
				<Icon icon="radio" size={20} />
			</a>
			<a
				href="/following"
				class="btn"
				class:active={page.route.id === '/following'}
				{@attach tooltip({content: 'Following'})}
			>
				<Icon icon="favorite" size={20} />
			</a>
			<a
				href="/stats"
				class="btn"
				class:active={page.route.id === '/stats'}
				{@attach tooltip({content: 'Stats'})}
			>
				<Icon icon="chart-scatter" size={20} />
			</a>
			<!-- <button onclick={toggleChatPanel}>Chat</button> -->
			<a
				href="/cli"
				class="btn"
				class:active={page.route.id === '/cli'}
				{@attach tooltip({content: 'CLI'})}
			>
				<Icon icon="terminal" size={20} />
			</a>
		{/await}
		<button
			onclick={toggleQueuePanel}
			class:active={appState.queue_panel_visible}
			{@attach tooltip({content: 'Toggle queue panel'})}
		>
			<Icon icon="sidebar-fill-right" size={20} />
		</button>
		<a
			href="/settings"
			class="btn"
			class:active={page.route.id === '/settings'}
			{@attach tooltip({content: 'Settings'})}
		>
			<Icon icon="settings" size={20} />
		</a>
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
	}
</style>
