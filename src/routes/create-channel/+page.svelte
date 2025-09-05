<script>
	import {goto} from '$app/navigation'
	//import {appState} from '$lib/app-state.svelte'

	function handleSubmit(event) {
		const {slug} = event.detail
		if (slug) goto(`/${slug}`)
	}
</script>

<article class="MiniContainer">
	<header>
		<p>What do you want to name your Radio4000 channel? <small>(can be changed anytime)</small></p>
	</header>
	<br />
	<r4-channel-create onsubmit={handleSubmit}></r4-channel-create>
</article>
