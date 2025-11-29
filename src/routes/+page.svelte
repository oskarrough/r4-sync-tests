<script>
	import {onMount} from 'svelte'
	import {page} from '$app/state'
	import {appState} from '$lib/app-state.svelte'
	import Channels from '$lib/components/channels.svelte'
	import {useLiveQuery} from '@tanstack/svelte-db'
	import {channelsCollection} from './tanstack/collections'
	import * as m from '$lib/paraglide/messages'

	const slug = $derived(page?.url?.searchParams?.get('slug'))
	const display = $derived(page?.url?.searchParams?.get('display'))
	const longitude = $derived(Number(page?.url?.searchParams?.get('longitude')))
	const latitude = $derived(Number(page?.url?.searchParams?.get('latitude')))
	const zoom = $derived(page?.url?.searchParams?.get('zoom') ? Number(page?.url?.searchParams?.get('zoom')) : 4)

	const channelsQuery = useLiveQuery((q) =>
		q.from({channels: channelsCollection}).orderBy(({channels}) => channels.created_at, 'desc').limit(5)
	)

	const channels = $derived(channelsQuery.data || [])

	onMount(() => {
		if (Boolean(display) && display !== appState.channels_display) {
			appState.channels_display = display
		}
	})
</script>

<svelte:head>
	<title>{m.home_title()}</title>
</svelte:head>

{#if channelsQuery.isLoading}
	<p>Loading channels…</p>
{:else if channelsQuery.isError}
	<p style="color: var(--red)">{channelsQuery.error.message}</p>
{/if}

<Channels {channels} {slug} {display} {longitude} {latitude} {zoom} />

