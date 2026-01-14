<script lang="ts">
	import Menu from './menu.svelte'
</script>

<div class="SmallContainer">
	<Menu />

	<p>Internal tools for testing and debugging our TanStack Query + DB implementation.</p>

	<dl>
		<dt><a href="/_debug/tanstack/diagnostics">diagnostics</a></dt>
		<dd>Real-time view of cache, collections, executor state. Persistence behavior.</dd>

		<dt><a href="/_debug/tanstack/recent-tracks">recent-tracks</a></dt>
		<dd>Cross-collection query demo. Proves DB's value over Query alone.</dd>

		<dt><a href="/_debug/tanstack/error-test">errors</a></dt>
		<dd>Documents useLiveQuery.isError limitation and workaround.</dd>

		<dt><a href="/_debug/tanstack/demo">demo</a></dt>
		<dd>Interactive tutorial: fetch → cache → reactive → mutations → collections.</dd>

		<dt><a href="/_debug/tanstack/tracks">tracks</a></dt>
		<dd>CRUD test for tracksCollection with offline executor.</dd>

		<dt><a href="/_debug/tanstack/channels">channels</a></dt>
		<dd>CRUD test for channelsCollection with offline executor.</dd>
	</dl>
</div>
