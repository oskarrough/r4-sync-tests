<script>
	import {appState} from '$lib/app-state.svelte'
</script>

<h1>App State</h1>
<pre>{JSON.stringify(appState, null, 2)}</pre>
