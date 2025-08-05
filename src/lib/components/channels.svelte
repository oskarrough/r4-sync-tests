<script>
	import {appState} from '$lib/app-state.svelte'
	import {pg} from '$lib/db'
	import Icon from './icon.svelte'
	import ChannelCard from './channel-card.svelte'
	import MapComponent from './map.svelte'

	const {slug: initialSlug, display: initialDisplay, longitude, latitude, zoom} = $props()

	/** @type {'list' | 'grid' | 'map'}*/
	let display = $derived(appState.channels_display || initialDisplay || 'grid')
	let limit = $state(15)
	let perPage = $state(100)
	let onlyChannelsWithImages = $state(false)
	/** @type {import('$lib/types').Channel[]}*/
	let channels = $state([])

	let filteredChannels = $derived(
		channels.filter((c) => (onlyChannelsWithImages ? c.image : true)).slice(0, limit)
	)
	let center = $derived(latitude && longitude ? [latitude, longitude] : null)

	const channelMapMarkers = $derived(
		channels
			.filter((c) => c.longitude && c.latitude)
			.map(({longitude, latitude, slug, name}) => ({
				longitude,
				latitude,
				title: name,
				href: slug,
				isActive: slug === initialSlug
			}))
	)

	$effect(() => {
		let cleanup

		pg.live
			.incrementalQuery('select * from channels order by created_at asc', [], 'id', (results) => {
				channels = results.rows
			})
			.then(({initialResults, unsubscribe}) => {
				channels = initialResults.rows
				cleanup = unsubscribe
			})

		return async () => {
			cleanup?.()
		}
	})

	// this doesn't work
	// onDestroy(async() => {
	// await pg.sql`UPDATE app_state SET channels_display = ${display} WHERE id = 1`
	// })

	function setDisplay(value = 'grid') {
		display = value
		appState.channels_display = display
	}
</script>

<div class={`layout layout--${display}`}>
	<menu>
		<label>
			Only images
			<input type="checkbox" title="" bind:checked={onlyChannelsWithImages} />
		</label>
		<button
			title="View as list"
			class:active={display === 'list'}
			onclick={() => setDisplay('list')}
		>
			<Icon icon="unordered-list" />
		</button>
		<button
			title="View as grid"
			class:active={display === 'grid'}
			onclick={() => setDisplay('grid')}
		>
			<Icon icon="grid" />
		</button>
		<button title="View as map" class:active={display === 'map'} onclick={() => setDisplay('map')}>
			<Icon icon="map" />
		</button>
	</menu>

	{#if display === 'map'}
		{#if channelMapMarkers}
			<MapComponent urlMode markers={channelMapMarkers} {center} {zoom}></MapComponent>
		{/if}
	{:else}
		<ol class={display}>
			{#each filteredChannels as channel (channel.id)}
				<li>
					<ChannelCard {channel} />
				</li>
			{/each}
		</ol>
		<footer>
			{#if filteredChannels?.length > 0}
				<p>
					Showing {limit} channels.
					<button onclick={() => (limit = limit + perPage)}>Load {perPage} more</button>
				</p>
			{/if}
		</footer>
	{/if}
</div>

<style>
	.layout {
		position: relative;
		&.layout--map {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
		}
	}
	menu {
		position: sticky;
		top: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin: 0.5rem;
		gap: 0.25rem;
		z-index: 1;

		label {
			user-select: none;
		}
	}

	menu :global(svg) {
		width: var(--font-size-large);
		margin-right: 0.2em;
	}

	footer p {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 2rem 0 10rem 0.5rem;
	}
</style>
