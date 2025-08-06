<script>
	import {base} from '$app/paths'
	import {page} from '$app/state'
	import {createEventDispatcher} from 'svelte'
	import L from 'leaflet'
	import {goto} from '$app/navigation'

	const {
		mapId = Date.now().toString(),
		markers = [],
		center = [0, 0],
		zoom,
		selectMode = false,
		urlMode = false
	} = $props()

	$effect(() => {
		if (map && zoom !== map.getZoom()) {
			map.setZoom(zoom)
		}
	})

	const dispatch = createEventDispatcher()
	let map
	let markerGroup
	let newMarker
	let debounceTimer

	// Derive only the valid markers
	const validMarkers = $derived(markers.filter((m) => m.latitude && m.longitude && m.title))

	function getCssVar(name) {
		return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
	}

	function createIcon(color) {
		const svg =
			`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">` +
			`<circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>` +
			`</svg>`
		return L.icon({
			iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
			iconSize: [24, 24],
			iconAnchor: [12, 12]
		})
	}

	function setup(node) {
		const fillNew = getCssVar('--color-accent')

		map = L.map(node)

		if (urlMode) {
			map.on('moveend', handleChange)
			map.on('zoomend', handleChange)
		}

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			className: 'Map-tiles'
		}).addTo(map)

		// Create an empty feature group container
		markerGroup = L.featureGroup().addTo(map)

		// Click-to-select marker logic
		if (selectMode) {
			map.on('click', (e) => {
				const {lat: latitude, lng: longitude} = e.latlng
				dispatch('mapClick', {latitude, longitude})
				if (newMarker) map.removeLayer(newMarker)
				newMarker = L.marker([latitude, longitude], {
					icon: createIcon(fillNew),
					title: 'New Position'
				})
					.addTo(map)
					.bindPopup(`${latitude}, ${longitude}`)
					.openPopup()
			})
		}

		if (center) {
			map.setView(center, zoom)
		}

		return {
			destroy() {
				map.remove()
				// Clear any pending debounced calls
				if (debounceTimer) {
					clearTimeout(debounceTimer)
				}
			}
		}
	}

	function handleChange() {
		// Clear any existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer)
		}

		// Set a new timer to update the URL after a delay
		debounceTimer = setTimeout(() => {
			const {lat, lng} = map.getCenter()
			const newZoom = map.getZoom()
			let query = new URL(page.url).searchParams
			query.set('latitude', lat.toFixed(5))
			query.set('longitude', lng.toFixed(5))
			query.set('zoom', newZoom)
			goto(`?${query.toString()}`)
		}, 500) // Wait 500ms after the last change before updating URL
	}

	// Redraw markers whenever validMarkers change
	$effect(() => {
		if (!map) return

		markerGroup.clearLayers()

		const fill = getCssVar('--gray-12')
		let activeMarker = null
		for (const markerData of validMarkers) {
			const {latitude, longitude, title, href, isActive} = markerData
			const popup = href ? `<a href="${base}/${href}">${title}</a>` : title
			const marker = L.marker([latitude, longitude], {icon: createIcon(fill), title})
				.addTo(markerGroup)
				.bindPopup(popup)

			if (isActive) {
				// Use setTimeout to ensure the marker is fully rendered before opening popup
				activeMarker = markerData
				setTimeout(() => {
					marker.openPopup()
				}, 100)
			}
		}

		if (validMarkers.length === 1) {
			const {latitude, longitude} = validMarkers[0]
			map.setView([latitude, longitude], zoom)
		} else if (activeMarker) {
			map.setView([activeMarker.latitude, activeMarker.longitude], zoom)
		} else if (validMarkers.length > 1 && !page?.url?.searchParams?.get('zoom')) {
			map.fitBounds(markerGroup.getBounds().pad(0.2))
		}
	})

	// Expose method to clear the temporary new marker
	export function clearNewMarker() {
		if (newMarker) {
			map.removeLayer(newMarker)
			newMarker = null
		}
	}
</script>

<div id={mapId} class="Map" use:setup></div>

<style>
	.Map {
		--map-tiles-filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3)
			brightness(0.7);
		width: 100%;
		height: 100%;
		background-color: transparent;
		:global(.leaflet-container) {
		}
		:global(.leaflet-popup-content a) {
			color: var(--gray-12);
			font-size: 1rem;
			white-space: pre;
		}
		:global(.leaflet-popup-content) {
		}
		:global(.leaflet-popup-content-wrapper, .leaflet-popup-tip) {
			background-color: var(--gray-2);
		}
		:global(.leaflet-popup a.leaflet-popup-close-button) {
		}
		@media (prefers-color-scheme: dark) {
			:global(.Map-tiles) {
				filter: var(--map-tiles-filter, none);
			}
		}
	}
</style>
