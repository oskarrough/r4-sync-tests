<script lang="ts">
	import Menu from '../menu.svelte'
	import {appState} from '$lib/app-state.svelte'

	function increment() {
		appState.counter++
	}
</script>

<Menu />

<p>Here we have a "global state" that can be mutated anywhere in the app, it's reactive and persisted to local storage without tanstack.</p>

<section>
	<p>appState.counter = {appState.counter} <button onclick={increment}>+1</button></p>
</section>
