<script>
	import L from 'leaflet'
	import * as m from '$lib/paraglide/messages'
	import MapComponent from '$lib/components/map.svelte'

	const {latitude = null, longitude = null, onselect = () => {}} = $props()

	let map = null
	let selectedMarker = null
	let selected = $state(null)

	function handleReady(m) {
		map = m
		if (latitude && longitude) {
			L.circleMarker([latitude, longitude], {
				radius: 8,
				color: '#fff',
				weight: 2,
				fillColor: '#666',
				fillOpacity: 1
			}).addTo(map)
		}
	}

	function handleClick({lat, lng}) {
		if (!map) return

		if (selectedMarker) selectedMarker.remove()

		selectedMarker = L.marker([lat, lng]).addTo(map)
		selected = {lat, lng}
		onselect({latitude: lat, longitude: lng})
	}

	function clearSelection() {
		if (selectedMarker) {
			selectedMarker.remove()
			selectedMarker = null
		}
		selected = null
		onselect({latitude: null, longitude: null})
	}
</script>

<MapComponent
	latitude={latitude ?? undefined}
	longitude={longitude ?? undefined}
	zoom={latitude && longitude ? 10 : 2}
	onclick={handleClick}
	onready={handleReady}
/>

{#if selected}
	<button type="button" onclick={clearSelection}>
		{m.common_cancel()}
	</button>
{/if}
