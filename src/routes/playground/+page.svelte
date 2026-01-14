<script>
	import {toggleQueuePanel} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import InputRange from '$lib/components/input-range.svelte'
	import * as m from '$lib/paraglide/messages'

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

<svelte:head>
	<title>{m.page_title_playground()}</title>
</svelte:head>

<h1>{m.playground_heading()}</h1>

<nav>
	<menu>
		<li><a href="/playground/async-test">async-test</a></li>
		<li><a href="/playground/media-chrome">media-chrome</a></li>
		<li><a href="/playground/spam-angel">spam-angel</a></li>
		<li><a href="/playground/tanstack">tanstack</a></li>
		<li><a href="/playground/tooltips">tooltips</a></li>
	</menu>
</nav>

<hr />

<section>
	<button onclick={toggleQueuePanel}>🔄 {m.playground_toggle_queue()}</button>
	<p>{m.playground_queue_visible({value: appState.queue_panel_visible})}</p>
	<InputRange bind:value={appState.volume} min={0} max={1} step={0.1} />
	<p>{m.playground_volume({value: appState.volume})}</p>
</section>

<hr />

<button onclick={add}>{m.playground_throw_error()}</button>
<p>{m.playground_counter({count, double})}</p>
