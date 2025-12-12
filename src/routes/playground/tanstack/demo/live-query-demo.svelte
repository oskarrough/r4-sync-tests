<script>
	import {useLiveQuery} from '$lib/tanstack/useLiveQuery.svelte.js'
	import {demoCollection} from '$lib/tanstack/collections/demo'

	const query = useLiveQuery((/** @type {any} */ q) =>
		q.from({todos: demoCollection}).select((/** @type {any} */ t) => t.todos)
	)
</script>

<pre>useLiveQuery: {query.status} ({query.data.length} items)</pre>

{#if query.data.length > 0}
	<p>Live query bridges cache → collection. Data updates reactively.</p>
	<slot />
{/if}
