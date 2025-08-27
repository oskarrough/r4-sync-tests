<script>
	import {goto} from '$app/navigation'
	//import {appState} from '$lib/app-state.svelte'

	function handleSubmit(event) {
		goto(`/${event.data.slug}`)
	}
</script>

<article>
	<header>
		<p>Choose a name for your new Radio4000 channel (can be changed anytime)</p>
	</header>
	<r4-channel-create onsubmit={handleSubmit}></r4-channel-create>
</article>
