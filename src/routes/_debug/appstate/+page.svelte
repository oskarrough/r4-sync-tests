<script>
	import {toggleQueuePanel} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import InputRange from '$lib/components/input-range.svelte'

	const localStorageKeys = ['r5-app-state', 'r5-follows', 'r5-track-meta', 'r5-play-history', 'r5-spam-decisions']

	const idbDatabases = ['keyval-store', 'r5-offline-mutations']

	function clearAll() {
		if (!confirm('Clear ALL data (localStorage + IndexedDB)? Page will reload.')) return
		for (const key of localStorageKeys) {
			localStorage.removeItem(key)
		}
		for (const db of idbDatabases) {
			indexedDB.deleteDatabase(db)
		}
		location.reload()
	}
</script>

<div class="SmallContainer">
	<menu class="grouped">
		<a href="/_debug">&larr;</a>
	</menu>
	<h1>App State</h1>

	<section>
		<menu>
			<button onclick={clearAll}>Clear all data</button>
		</menu>
	</section>

	<section>
		<h2>Reactivity test</h2>
		<button onclick={toggleQueuePanel}>Toggle queue</button>
		<p>Queue visible: {appState.queue_panel_visible}</p>
		<InputRange bind:value={appState.volume} min={0} max={1} step={0.1} />
		<p>Volume: {appState.volume}</p>
	</section>
</div>

<style>
	h2 {
		margin-block-start: 2rem;
	}
</style>
