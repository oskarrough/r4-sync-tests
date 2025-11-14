<script>
	import {appState} from '$lib/app-state.svelte'
	import * as m from '$lib/paraglide/messages'

	function inc() {
		appState.counter++
	}
</script>

<button onclick={inc}> {m.test_counter_prefix()}{appState.counter}</button>

<style>
	button {
		min-width: 2.7rem;
	}

	:global(a.active) button {
		border-color: var(--accent-9);
	}
</style>
