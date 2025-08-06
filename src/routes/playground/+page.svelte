<script>
	// import {liveQuery} from '$lib/live-query'
	import {toggleQueuePanel} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import InputRange from '$lib/components/input-range.svelte'

	let count = $state()
	const double = $derived(count * 2)

	// $effect(() => {
	// 	return liveQuery(`select counter from app_state where id = 1`, [], (stuff) => {
	// 		console.log('app state live query from /playground ran')
	// 		count = stuff.rows[0].counter
	// 	})
	// })

	function add() {
		throw new Error('something bad happened')
		//return pg.sql`insert into channels (name, slug) values (${'huguooo'}, ${'hugo123'})`
	}
</script>

<h1>playground</h1>

<section>
	<button onclick={toggleQueuePanel}> 🔄 Toggle Queue Panel </button>
	<p>queue_panel_visible: {appState.queue_panel_visible}</p>
	<InputRange bind:value={appState.volume} min={0} max={1} step={0.1} />
	<p>volume: {appState.volume}</p>
</section>

<hr />

<button onclick={add}>throw an unexpected error</button>
<p>{count} x 2 = {double}</p>
