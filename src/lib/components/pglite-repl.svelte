<script>
	/**
	 * Load the repl web component async so it doesn't slow us down.
	 * Connect our `pg` client to the element.
	 */

	import {pg} from '$lib/r5/db'
	import * as m from '$lib/paraglide/messages'

	let el = $state()
	let enabled = $state(false)

	function enable() {
		enabled = true
		import('@electric-sql/pglite-repl/webcomponent').then(() => {
			el.pg = pg
		})
	}
</script>

<header>
	<h2>{m.pglite_heading()}</h2>
	{#if !enabled}
		<button onclick={enable}>{m.pglite_button_enable()}</button>
	{/if}
</header>

{#if enabled}
	<p>{m.pglite_description()}</p>
	<pglite-repl bind:this={el}></pglite-repl>
{/if}

<style>
	header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
