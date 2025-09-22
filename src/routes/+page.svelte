<script>
	import {onMount} from 'svelte'
	import {invalidateAll} from '$app/navigation'
	import {page} from '$app/state'
	import {appState} from '$lib/app-state.svelte'
	import Channels from '$lib/components/channels.svelte'
	import Icon from '$lib/components/icon.svelte'
	import {r5} from '$lib/r5'
	import {getPg} from '$lib/r5/db.js'

	// const {data} = $props()

	const slug = $derived(page?.url?.searchParams?.get('slug'))
	const display = $derived(page?.url?.searchParams?.get('display'))
	const longitude = $derived(Number(page?.url?.searchParams?.get('longitude')))
	const latitude = $derived(Number(page?.url?.searchParams?.get('latitude')))
	const zoom = $derived(page?.url?.searchParams?.get('zoom') ? Number(page?.url?.searchParams?.get('zoom')) : 4)

	let syncing = $state(false)

	/** @type {import('$lib/types').Channel[]} */
	let channels = $state([])

	onMount(() => {
		getPg().then((pg) => {
			if (Boolean(display) && display !== appState.channels_display) {
				appState.channels_display = display
			}
			pg.query('SELECT * FROM channels ORDER BY created_at DESC').then((result) => {
				channels = result.rows
			})
		})
	})

	const channelCount = $derived(channels?.length || 0)

	async function pullRadios() {
		syncing = true
		try {
			await r5.channels.pull()
			await invalidateAll()
		} finally {
			syncing = false
		}
	}
</script>

<svelte:head>
	<title>R5</title>
</svelte:head>

{#if channelCount < 100}
	<menu>
		<button onclick={pullRadios} disabled={syncing}>
			<Icon icon="cloud-download-alt">
				{syncing ? 'Pulling radios...' : 'Pull radios from radio4000.com'}
			</Icon>
		</button>
	</menu>
{/if}

<Channels {channels} {slug} {display} {longitude} {latitude} {zoom} />

<style>
	menu {
		top: 0;
		z-index: 1;
		padding: 0 0.5rem;
		display: flex;
		gap: 0.5rem;
		margin: 1rem 0 0.6rem;
		> * {
			margin: 0;
		}
	}
	menu :global(svg) {
		width: 1.25em;
		margin-right: 0.2em;
	}
</style>
