<script>
	import {_} from 'svelte-i18n'
	import MapComponent from '$lib/components/map.svelte'

	const {latitude = null, longitude = null, title = '', onselect = () => {}} = $props()

	let selected = $state(null)
	let mapComponent

	const markers = $derived(
		latitude && longitude
			? [
					{
						latitude,
						longitude,
						title: title || ''
					}
				]
			: []
	)

	function onMapClick(event) {
		selected = event.detail
		onselect(selected)
	}

	function clearSelection() {
		selected = null
		onselect({})
		mapComponent?.clearNewMarker()
	}
</script>

<MapComponent bind:this={mapComponent} {markers} selectMode={true} on:mapClick={onMapClick} />

{#if selected}
	<button type="button" onclick={clearSelection}>
		{$_('common.cancel')}
	</button>
{/if}
