<script>
	/**
	 * Load the repl web component async so it doesn't slow us down.
	 * Connect our `pg` client to the element.
	 */

	import {pg} from '$lib/r5/db'

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
	<h2>PGLite repl</h2>
	{#if !enabled}
		<button onclick={enable}>Enter REPL</button>
	{/if}
</header>

{#if enabled}
	<p>Try querying channels, tracks or app_state using SQL.</p>
	<pglite-repl bind:this={el}></pglite-repl>
{/if}

<style>
	header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
