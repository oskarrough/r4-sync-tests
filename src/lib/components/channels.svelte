<script>
	import {appState} from '$lib/app-state.svelte'
	import {shuffleArray} from '$lib/utils'
	import Icon from './icon.svelte'
	import ChannelCard from './channel-card.svelte'
	import MapComponent from './map.svelte'

	const {
		channels = [],
		slug: initialSlug,
		display: initialDisplay,
		longitude,
		latitude,
		zoom
	} = $props()

	let limit = $state(15)
	let perPage = $state(100)
	let filter = $state('all')
	let shuffled = $state(true)

	/** @type {'list' | 'grid' | 'map'}*/
	let display = $derived(appState.channels_display || initialDisplay || 'grid')
	/** @type {import('$lib/types').Channel[]}*/
	const center = $derived(longitude && latitude ? {longitude, latitude} : null)

	/*
	const channelsPromise = $derived.by(
		async () => (await pg.sql`SELECT * FROM channels ORDER BY created_at DESC`).rows
	)*/

	const realChannels = $derived.by(() => processChannels(channels))

	function filterChannels() {
		return channels.filter((c) => {
			if (filter === 'all') return true
			if (filter === 'artwork' && !c.image) return false
			if (filter === '10+' && (!c.track_count || c.track_count < 10)) return false
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
</script>

<div class={`layout layout--${display}`}>
	<menu>
		<div class="filters">
			<label title="Channel filter">
				<select bind:value={filter}>
					<option value="all">All</option>
					<option value="10+">10+ tracks</option>
					<option value="100+">100+ tracks</option>
					<option value="1000+">1000+ tracks</option>
					<option value="artwork">Has artwork</option>
				</select>
			</label>
			<button
				title="Show random channels"
				class:active={shuffled}
				onclick={() => (shuffled = !shuffled)}
			>
				<Icon icon="shuffle" />
			</button>
		</div>
		<div class="display">
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
			<button
				title="View as map"
				class:active={display === 'map'}
				onclick={() => setDisplay('map')}
			>
				<Icon icon="map" />
			</button>
		</div>
	</menu>

	{#if display === 'map'}
		{#if realChannels.mapMarkers}
			<MapComponent urlMode markers={realChannels.mapMarkers} {center} {zoom}></MapComponent>
		{/if}
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
