<script>
	import {appState} from '$lib/app-state.svelte'

	function inc() {
		appState.counter++
	}
</script>

<button onclick={inc}> R{appState.counter}</button>

<style>
	button {
		min-width: 2.7rem;
	}

	:global(a.active) button {
		border-color: var(--color-accent);
	}
</style>
