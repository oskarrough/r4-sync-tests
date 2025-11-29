<script>
	import {page} from '$app/state'
	import {appState} from '$lib/app-state.svelte'
	import {watchBroadcasts} from '$lib/broadcast'
	import AddTrackModal from '$lib/components/add-track-modal.svelte'
	import EditTrackModal from '$lib/components/edit-track-modal.svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import HeaderSearch from '$lib/components/header-search.svelte'
	import Icon from '$lib/components/icon.svelte'
	import TestCounter from '$lib/components/test-counter.svelte'
	import {tooltip} from '$lib/components/tooltip-attachment.js'
	import ThemeToggle from '$lib/components/theme-toggle.svelte'
	import * as m from '$lib/paraglide/messages'
	import {queryClient, channelsCollection} from '../../routes/tanstack/collections'

	const {preloading} = $props()

	// Cache debug timer
	const STALE_TIME = 10 * 1000
	const MAX_AGE = 20 * 1000
	let cacheState = $state(/** @type {{staleIn: number, expiresIn: number, isStale: boolean} | null} */ (null))
	$effect(() => {
		function update() {
			const query = queryClient.getQueryState(['channels'])
			if (!query?.dataUpdatedAt) {
				cacheState = null
				return
			}
			const age = Date.now() - query.dataUpdatedAt
			cacheState = {
				staleIn: Math.max(0, Math.ceil((STALE_TIME - age) / 1000)),
				expiresIn: Math.max(0, Math.ceil((MAX_AGE - age) / 1000)),
				isStale: age > STALE_TIME
			}
		}
		update()
		const interval = setInterval(update, 1000)
		return () => clearInterval(interval)
	})

	const userChannel = $derived(appState.channels?.[0] ? channelsCollection.get(appState.channels[0]) : null)

	let broadcastCount = $state(0)
	let editModalRef = $state()

	const unsubscribe = watchBroadcasts((data) => {
		broadcastCount = data.broadcasts.length
	})

	function handleEditTrackEvent(event) {
		editModalRef?.openWithTrack(event.detail.track)
	}

	$effect(() => unsubscribe)
</script>

<svelte:window on:r5:openEditModal={handleEditTrackEvent} />

<header>
	<a href="/" class:active={page.route.id === '/'}>
		{#await preloading}
			{m.app_name()}
		{:then}
			<TestCounter />
		{/await}
	</a>
	<HeaderSearch />

	{#if cacheState}
		<small class="cache-debug" class:stale={cacheState.isStale}>
			stale:{cacheState.staleIn}s exp:{cacheState.expiresIn}s
		</small>
	{/if}

	<menu class="row right">
		{#await preloading then}
			<AddTrackModal />
			<EditTrackModal bind:this={editModalRef} />
			{#if userChannel}
				<a href="/{userChannel.slug}">
					<ChannelAvatar id={userChannel.image} size={32} alt={userChannel.name} />
				</a>
			{/if}
			<hr />
			<a
				href="/broadcasts"
				class="btn"
				class:active={page.route.id === '/broadcasts'}
				{@attach tooltip({content: m.nav_broadcasts()})}
			>
				<Icon icon="signal" size={20} />
				{#if broadcastCount > 0}
					<span class="count">{broadcastCount}</span>
				{/if}
			</a>
			<a
				href="/following"
				class="btn"
				class:active={page.route.id === '/following'}
				{@attach tooltip({content: m.nav_following()})}
			>
				<Icon icon="favorite" size={20} />
			</a>
			<a
				href="/stats"
				class="btn"
				class:active={page.route.id === '/stats'}
				{@attach tooltip({content: m.nav_stats()})}
			>
				<Icon icon="chart-scatter" size={20} />
			</a>
			<!-- <button onclick={toggleChatPanel}>Chat</button> -->
		{/await}
		<ThemeToggle showLabel={false} />
		<a
			href="/settings"
			class="btn"
			class:active={page.route.id === '/settings'}
			{@attach tooltip({content: m.nav_settings()})}
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
		background: var(--header-bg);
		border-bottom: 1px solid light-dark(var(--gray-5), var(--gray-5));
		transition: background 150ms;

		.right {
			margin-left: auto;
		}

		a {
			text-decoration: none;
		}
	}

	.count {
		position: absolute;
		top: -7px;
		right: -5px;
		background: var(--color-red);
		color: white;
		border-radius: 50%;
		font-size: var(--font-1);
		min-width: 1.2rem;
		height: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn:has(.count) {
		position: relative;
	}

	.cache-debug {
		font-family: monospace;
		font-size: var(--font-2);
		padding: 0.2rem 0.4rem;
		background: var(--green-3);
		border-radius: 3px;
		&.stale {
			background: var(--orange-3);
		}
	}
</style>
