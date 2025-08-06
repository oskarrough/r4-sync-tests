<script>
	import {pg} from '$lib/db'

	let count = $state(0)

	pg.sql`select counter from app_state`
		.then((data) => {
			if (data.rows?.length) count = data.rows[0].counter
		})
		.catch(console.warn)

	async function inc() {
		count = count + 1
		await pg.sql`update app_state set counter = ${$state.snapshot(count)} where id = 1`
	}
</script>

<button onclick={inc}> R{count}</button>

<style>
	button {
		min-width: 2.7rem;
	}

	:global(a.active) button {
		border-color: var(--color-accent);
	}
</style>
