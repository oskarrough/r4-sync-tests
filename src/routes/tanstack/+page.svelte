<script lang="ts">
	import {appState, initAppState, persistAppState} from './app-state.svelte'

	initAppState()

	function increment() {
		appState.counter++
		persistAppState()
	}

	function toggleTheme() {
		appState.theme = appState.theme === 'dark' ? 'light' : 'dark'
		persistAppState()
	}
</script>

<h2>TanStack DB Tests</h2>

<ul>
	<li><a href="/tanstack/channels">Channels Collection</a></li>
	<li><a href="/tanstack/tracks">Tracks Collection</a></li>
</ul>

<section>
	<h3>App State (localStorage)</h3>
	<dl>
		<dt>Counter</dt>
		<dd>{appState.counter} <button onclick={increment}>+1</button></dd>
		<dt>Theme</dt>
		<dd>{appState.theme ?? 'default'} <button onclick={toggleTheme}>toggle</button></dd>
		<dt>Volume</dt>
		<dd>{appState.volume}</dd>
	</dl>
	<p><small>Check localStorage → <code>r5-tanstack-app-state</code></small></p>
</section>

<p>
	Open DevTools console to see query logs. Check IndexedDB for persistence (<code>keyval-store</code> →
	<code>r5-tanstack-query</code>).
</p>
