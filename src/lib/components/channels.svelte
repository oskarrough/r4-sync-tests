<script>
	import {appState} from '$lib/app-state.svelte'
	import {pg} from '$lib/db'
	import {shuffleArray} from '$lib/utils'
	import Icon from './icon.svelte'
	import ChannelCard from './channel-card.svelte'
	import MapComponent from './map.svelte'

	const {slug: initialSlug, display: initialDisplay, longitude, latitude, zoom} = $props()

	/** @type {'list' | 'grid' | 'map'}*/
	let display = $derived(appState.channels_display || initialDisplay || 'list')
	let limit = $state(15)
	let perPage = $state(100)
	let filter = $state('10+')
	let shuffled = $state(true)

	const channelsPromise = $derived.by(async () => (await pg.sql`SELECT * FROM channels ORDER BY created_at DESC`).rows)
	
	function filterChannels(channels) {
		return channels.filter((c) => {
			if (filter === 'all') return true
			if (filter === 'artwork' && !c.image) return false
			if (filter === '10+' && (!c.track_count || c.track_count < 10)) return false
			if (filter === '100+' && (!c.track_count || c.track_count < 100)) return false
			if (filter === '1000+' && (!c.track_count || c.track_count < 1000)) return false
			return true
		})
	}
	
	function processChannels(channels) {
		const filtered = filterChannels(channels)
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

	{#await channelsPromise}
		<p>Loading channels...</p>
	{:then channels}
		{@const processed = processChannels(channels)}
		
		{#if display === 'map'}
			{#if processed.mapMarkers}
				<MapComponent urlMode markers={processed.mapMarkers} {center} {zoom}></MapComponent>
			{/if}
		{:else}
			<ol class={display}>
				{#each processed.displayed as channel (channel.id)}
					<li>
						<ChannelCard {channel} />
					</li>
				{/each}
			</ol>
			<footer>
				{#if processed.displayed?.length > 0}
					<p>
						Showing {processed.displayed.length} of {processed.filtered.length} channels.
						{#if processed.displayed.length < processed.filtered.length}
							<button onclick={() => (limit = limit + perPage)}>Load {perPage} more</button>
						{/if}
					</p>
				{/if}
			</footer>
		{/if}
	{:catch error}
		<p>Error loading channels: {error.message}</p>
	{/await}
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
