<script>
	import {invalidateAll} from '$app/navigation'
	import {page} from '$app/state'
	import {sync} from '$lib/sync'
	import Icon from '$lib/components/icon.svelte'
	import Channels from '$lib/components/channels.svelte'
	import {liveQuery} from '$lib/live-query'

	const {data} = $props()

	const slug = $derived(page?.url?.searchParams?.get('slug'))
	const display = $derived(page?.url?.searchParams?.get('display') || 'grid')
	const longitude = $derived(Number(page?.url?.searchParams?.get('longitude')))
	const latitude = $derived(Number(page?.url?.searchParams?.get('latitude')))
	const zoom = $derived(
		page?.url?.searchParams?.get('zoom') ? Number(page?.url?.searchParams?.get('zoom')) : 4
	)

	let channelCount = $state(0)
	let syncing = $state(false)

	$effect(() => {
		return liveQuery('SELECT COUNT(*) as count FROM channels', [], (result) => {
			channelCount = result.rows[0]?.count || 0
		})
	})

	async function pullRadios() {
		syncing = true
		try {
			await sync()
			await invalidateAll()
		} finally {
			syncing = false
		}
	}
</script>

<Channels channels={data.channels} {slug} {display} {longitude} {latitude} {zoom} />

{#if channelCount === 0}
	<menu>
		<button onclick={pullRadios} disabled={syncing}>
			<Icon icon="cloud-download-alt">
				{syncing ? 'Pulling radios...' : 'Pull radios from radio4000.com'}
			</Icon>
		</button>
	</menu>
{/if}

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
