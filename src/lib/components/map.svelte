<script>
	import L from 'leaflet'
	import {base} from '$app/paths'
	import {shufflePlayChannel} from '$lib/api'

	const {markers = []} = $props()

	function setup(node) {
		const params = new URLSearchParams(location.search)
		const lat = Number(params.get('latitude')) || 20
		const lng = Number(params.get('longitude')) || 0
		const z = Number(params.get('zoom')) || 2

		const map = L.map(node).setView([lat, lng], z)

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap'
		}).addTo(map)

		for (const m of markers) {
			if (m.latitude && m.longitude) {
				const popup = document.createElement('div')
				popup.innerHTML = `<a href="${base}/${m.slug}">${m.title}</a>`
				const playBtn = document.createElement('button')
				playBtn.textContent = '▶'
				playBtn.onclick = () => shufflePlayChannel({id: m.id, slug: m.slug})
				popup.appendChild(playBtn)

				L.circleMarker([m.latitude, m.longitude], {
					radius: 6,
					color: '#fff',
					weight: 2,
					fillColor: '#666',
					fillOpacity: 1
				})
					.addTo(map)
					.bindPopup(popup)
			}
		}

		let debounce
		map.on('moveend', () => {
			clearTimeout(debounce)
			debounce = setTimeout(() => {
				const {lat, lng} = map.getCenter()
				const z = map.getZoom()
				const url = new URL(location.href)
				url.searchParams.set('latitude', lat.toFixed(4))
				url.searchParams.set('longitude', lng.toFixed(4))
				url.searchParams.set('zoom', z)
				history.replaceState(null, '', url)
			}, 300)
		})

		return () => map.remove()
	}
</script>

<div class="map" {@attach setup}></div>

<style>
	.map {
		width: 100%;
		height: 100dvh;
		z-index: 1;
	}
</style>
