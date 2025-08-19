<script>
	import {invalidateAll} from '$app/navigation'
	import {page} from '$app/state'
	import {r5} from '$lib/r5'
	import Icon from '$lib/components/icon.svelte'
	import Channels from '$lib/components/channels.svelte'

	const {data} = $props()

	const slug = $derived(page?.url?.searchParams?.get('slug'))
	const display = $derived(page?.url?.searchParams?.get('display') || 'grid')
	const longitude = $derived(Number(page?.url?.searchParams?.get('longitude')))
	const latitude = $derived(Number(page?.url?.searchParams?.get('latitude')))
	const zoom = $derived(
		page?.url?.searchParams?.get('zoom') ? Number(page?.url?.searchParams?.get('zoom')) : 4
	)

	let syncing = $state(false)

	const channelCount = $derived(data.channels?.length || 0)

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

<Channels channels={data.channels} {slug} {display} {longitude} {latitude} {zoom} />

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
