<script>
	import {page} from '$app/state'
	import {goto} from '$app/navigation'
	import {appState} from '$lib/app-state.svelte'
	import {shuffleArray} from '$lib/utils.ts'
	import Icon from './icon.svelte'
	import ChannelCard from './channel-card.svelte'
	import MapComponent from './map.svelte'
	import SpectrumScanner from './spectrum-scanner.svelte'

	const {channels = [], slug: initialSlug, display: initialDisplay, longitude, latitude, zoom} = $props()

	let limit = $state(30)
	let perPage = $state(100)
	let filter = $state('20+')
	let shuffled = $state(true)

	/** @type {'grid' | 'list' | 'map' | 'coordinates' | 'spectrum' | 'drift'}*/
	let display = $derived(appState.channels_display || initialDisplay || 'grid')

	/*
	const channelsPromise = $derived.by(
		async () => (await pg.sql`SELECT * FROM channels ORDER BY created_at DESC`).rows
	)*/

	const realChannels = $derived.by(() => processChannels())

	function filterChannels() {
		return channels.filter((c) => {
			if (filter === 'all') return true
			if (filter === 'v2') return c.source !== 'v1'
			if (filter === 'artwork' && !c.image) return false
			if (filter === '20+' && (!c.track_count || c.track_count < 20)) return false
			if (filter === '100+' && (!c.track_count || c.track_count < 100)) return false
			if (filter === '1000+' && (!c.track_count || c.track_count < 1000)) return false
			return true
		})
	}

	function processChannels() {
		const filtered = filterChannels()
		const processed = shuffled ? shuffleArray([...filtered]) : filtered
		return {
			filtered,
			displayed: processed.slice(0, limit),
			mapMarkers: channels
				.filter((c) => c.longitude && c.latitude)
				.map(({longitude, latitude, slug, name}) => ({
					longitude,
					latitude,
					title: name,
					href: slug,
					isActive: slug === initialSlug
				}))
		}
	}

	function setDisplay(value = 'grid') {
		display = value
		appState.channels_display = display
	}

	function handleMapChange({latitude, longitude, zoom}) {
		const query = new URL(page.url).searchParams
		query.set('latitude', latitude)
		query.set('longitude', longitude)
		query.set('zoom', zoom)
		goto(`?${query.toString()}`, {replaceState: true, keepFocus: true})
	}
</script>

{#snippet displayBtn(prop, icon)}
	<button title={`View as ${prop}`} class:active={display === prop} onclick={() => setDisplay(prop)}>
		<Icon {icon} />
	</button>
{/snippet}

<div class={`layout layout--${display}`}>
	<menu>
		<div class="filters">
			<label title="Channel filter">
				<select bind:value={filter}>
					<option value="all">All</option>
					<option value="20+">20+ tracks</option>
					<option value="100+">100+ tracks</option>
					<option value="1000+">1000+ tracks</option>
					<option value="artwork">Has artwork</option>
					<option value="v2">v2</option>
				</select>
			</label>
			<button title="Show random channels" class:active={shuffled} onclick={() => (shuffled = !shuffled)}>
				<Icon icon="shuffle" />
			</button>
		</div>
		<div class="display">
			{@render displayBtn('grid', 'grid')}
			{@render displayBtn('list', 'unordered-list')}
			{@render displayBtn('map', 'map')}
			{@render displayBtn('tuner', 'radio')}
		</div>
	</menu>

	{#if display === 'map'}
		{#if realChannels.mapMarkers}
			<MapComponent
				urlMode
				markers={realChannels.mapMarkers}
				{latitude}
				{longitude}
				{zoom}
				onmapchange={handleMapChange}
			></MapComponent>
		{/if}
	{:else if display === 'tuner'}
		<SpectrumScanner channels={realChannels.filtered} />
	{:else}
		<ol class={display}>
			{#each realChannels.displayed as channel (channel.id)}
				<li>
					<ChannelCard {channel} />
				</li>
			{/each}
		</ol>
		<footer>
			{#if realChannels.displayed?.length > 0}
				<p>
					Showing {realChannels.displayed.length} of {realChannels.filtered.length} channels.
					{#if realChannels.displayed.length < realChannels.filtered.length}
						<button onclick={() => (limit = limit + perPage)}>Load {perPage} more</button>
					{/if}
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
		justify-content: space-between;
		margin: 0.5rem;
		gap: 0.2rem;
		z-index: 1;

		.filters,
		.display {
			display: flex;
			align-items: center;
			gap: 0.2rem;
		}

		label {
			user-select: none;
			display: flex;
			align-items: center;
			gap: 0.3rem;
		}
	}

	menu :global(svg) {
		width: var(--font-5);
		margin-right: 0.2em;
	}

	footer p {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 2rem 0 10rem 0.5rem;
	}
</style>
