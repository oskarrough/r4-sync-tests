<script>
	import {toggleQueuePanel} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import InputRange from '$lib/components/input-range.svelte'
</script>

<div class="SmallContainer">
	<menu class="grouped">
		<a href="/_debug">&larr;</a>
	</menu>
	<h1>App State</h1>

	<p>Testing appState reactivity</p>

	<section>
		<button onclick={toggleQueuePanel}>Toggle queue</button>
		<p>Queue visible: {appState.queue_panel_visible}</p>
		<InputRange bind:value={appState.volume} min={0} max={1} step={0.1} />
		<p>Volume: {appState.volume}</p>
	</section>
</div>
