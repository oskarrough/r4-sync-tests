<script>
	import {useLiveQuery} from '$lib/tanstack/useLiveQuery.svelte.js'
	import {demoCollection, demoAPI} from '$lib/tanstack/collections/demo'
	/** @typedef {import('$lib/tanstack/collections/demo').DemoTodo} DemoTodo */

	let step = $state(1)
	/** @type {DemoTodo[] | null} */
	let lastResult = $state(null)
	let fetchCount = $state(0)
	let liveQueryEnabled = $state(false)

	// Always create the liveQuery - it handles disabled state internally
	const liveQuery = useLiveQuery((/** @type {any} */ q) =>
		liveQueryEnabled ? q.from({todos: demoCollection}).select((/** @type {any} */ t) => t.todos) : null
	)

	// Derive cache/collection state reactively instead of manual refresh
	const cacheState = $derived(demoAPI.getQueryCache())
	const collectionState = $derived(demoAPI.getCollectionState())

	async function justFetch() {
		fetchCount++
		lastResult = await demoAPI.fetchTodos(5, 0)
	}

	async function fetchWithCache() {
		fetchCount++
		lastResult = await demoAPI.fetchQuery()
	}

	function nextStep() {
		step++
	}

	function reset() {
		step = 1
		fetchCount = 0
		liveQueryEnabled = false
		demoAPI.clearCache()
		demoAPI.clearCollection()
		lastResult = null
	}
</script>

<article>
	<h1>Why all these layers?</h1>
	<p>An interactive exploration of state management evolution.</p>

	<nav>
		<button onclick={reset}>Reset</button>
		<small>Network requests: {fetchCount}</small>
	</nav>

	<hr />

	<!-- Step 1: Just Fetch -->
	<section data-active={step === 1}>
		<h2>Step 1: Just fetch</h2>
		<p>You fetch data from an API. You render it. That's it.</p>

		<button onclick={justFetch}>Fetch 5 todos</button>

		{#if lastResult?.length}
			<ul>
				{#each lastResult as todo (todo.id)}
					<li>{todo.todo}</li>
				{/each}
			</ul>
			<p>This works. Nothing wrong with it.</p>
			<button onclick={nextStep}>But what if...</button>
		{/if}
	</section>

	<!-- Step 2: The Problem -->
	{#if step >= 2}
		<section data-active={step === 2}>
			<h2>Step 2: The problem</h2>
			<p>Click fetch again. Pretend you navigated away and came back.</p>

			<button onclick={justFetch}>Fetch again</button>

			<pre>Network requests: {fetchCount}</pre>

			{#if fetchCount >= 2}
				<p>
					We already had this data. Why fetch again?
					<br />
					"Just fetch again" works until it doesn't.
				</p>
				<button onclick={nextStep}>Enter caching →</button>
			{/if}
		</section>
	{/if}

	<!-- Step 3: Cache -->
	{#if step >= 3}
		<section data-active={step === 3}>
			<h2>Step 3: Cache it</h2>
			<p><code>fetchQuery</code> caches the response. Click it twice:</p>

			<button onclick={fetchWithCache}>fetchQuery (cached)</button>

			<pre>Network requests: {fetchCount}
Cache: {cacheState.length ? `${cacheState[0]?.data?.length || 0} items` : 'empty'}</pre>

			{#if cacheState.length > 0}
				<p>Second click? No new request. Data came from cache.</p>
				<p>But now we have <strong>two sources of truth</strong> - the API and our cache.</p>
				<button onclick={nextStep}>When do we use which? →</button>
			{/if}
		</section>
	{/if}

	<!-- Step 4: Stale Time -->
	{#if step >= 4}
		<section data-active={step === 4}>
			<h2>Step 4: Stale time</h2>
			<p>The cache decides: <strong>fresh?</strong> use it. <strong>stale?</strong> refetch.</p>

			<pre>staleTime: 5 minutes (for this demo)
gcTime: 24 hours</pre>

			<p>This is controlled by two settings:</p>
			<ul>
				<li><strong>staleTime</strong> - how long before we consider data "old" and refetch</li>
				<li><strong>gcTime</strong> - how long before we throw away cached data entirely</li>
			</ul>

			<p>Now reads automatically respect our preferences. But there's another problem...</p>
			<button onclick={nextStep}>The cache is just blobs →</button>
		</section>
	{/if}

	<!-- Step 5: Blobs Problem -->
	{#if step >= 5}
		<section data-active={step === 5}>
			<h2>Step 5: The cache is just blobs</h2>
			<p>Load a second batch:</p>

			<button onclick={() => demoAPI.fetchSecondBatch()}>Fetch batch 2 (items 11-20)</button>

			{#if cacheState.length > 1}
				<pre>Cache:
  ["demo-todos"]: {cacheState[0]?.data?.length || 0} items
  ["demo-todos","batch2"]: {cacheState[1]?.data?.length || 0} items</pre>

				<p>Now try: "show all todos sorted by completion status"</p>
				<p>
					You can't. Each query key is an opaque blob. The cache doesn't know what's inside, can't merge them, can't
					filter across them. It's a key-value store, not a database.
				</p>
				<button onclick={nextStep}>→</button>
			{/if}
		</section>
	{/if}

	<!-- Step 6: Collections -->
	{#if step >= 6}
		<section data-active={step === 6}>
			<h2>Step 6: Collections</h2>
			<p>
				A collection is an in-memory Map you can query. <code>useLiveQuery</code> bridges cache → collection: it pulls cached
				data in and keeps it reactive.
			</p>

			<label>
				<input type="checkbox" bind:checked={liveQueryEnabled} />
				Enable useLiveQuery
			</label>

			{#if liveQueryEnabled}
				<pre>Collection: {collectionState.size} items</pre>

				<p>Both batches, one queryable store. Now you can:</p>
				<code>q.from(todos).where(t =&gt; t.completed).orderBy(t =&gt; t.id)</code>
				<button onclick={nextStep}>→</button>
			{/if}
		</section>
	{/if}

	<!-- Step 7: Writes Problem -->
	{#if step >= 7}
		<section data-active={step === 7}>
			<h2>Step 7: The writes problem</h2>
			<p>Safest approach: 1) update via API (400ms) → 2) refetch (200ms)</p>
			<p>That's two network requests. And you wait 600ms before seeing your change.</p>

			<p>What if we could:</p>
			<ol>
				<li>Update locally (instant)</li>
				<li>Sync to API in background</li>
				<li>Rollback if rejected</li>
			</ol>

			<button onclick={nextStep}>Optimistic mutations →</button>
		</section>
	{/if}

	<!-- Step 8: Optimistic Mutations -->
	{#if step >= 8}
		<section data-active={step === 8}>
			<h2>Step 8: Optimistic mutations</h2>
			<p>Insert locally. UI updates instantly. Sync happens in background.</p>

			<button onclick={() => demoAPI.insertTodo({todo: 'New todo ' + Date.now(), completed: false, userId: 1})}>
				Insert Todo (optimistic)
			</button>

			<pre>Collection: {collectionState.size} items</pre>

			{#if collectionState.size > 10}
				<p>Item appeared instantly. In a real app, it syncs to the server in the background.</p>
				<p>If the server rejects it? The mutation rolls back.</p>
				<button onclick={nextStep}>Summary →</button>
			{/if}
		</section>
	{/if}

	<!-- Step 9: Summary -->
	{#if step >= 9}
		<section data-active={step === 9}>
			<h2>The full picture</h2>

			<pre>
Read:  cache → stale? → fetch → update cache
Write: mutate locally → queue mutation → process when online → rollback if rejected
			</pre>

			<p>We needed:</p>
			<ul>
				<li><strong>Cache</strong> - avoid redundant fetches (TanStack Query)</li>
				<li><strong>Collections</strong> - queryable, reactive store (TanStack DB)</li>
				<li><strong>Mutation queue</strong> - offline-first writes (TanStack Offline)</li>
			</ul>

			<p>Each layer solves a real problem. No layer exists "just because".</p>

			<table>
				<thead>
					<tr>
						<th>Problem</th>
						<th>Solution</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Refetching data we already have</td>
						<td>Cache</td>
					</tr>
					<tr>
						<td>When to use cache vs API?</td>
						<td>Stale time</td>
					</tr>
					<tr>
						<td>Cache is just blobs</td>
						<td>Collections</td>
					</tr>
					<tr>
						<td>Writes are slow</td>
						<td>Optimistic mutations</td>
					</tr>
					<tr>
						<td>Offline support</td>
						<td>Mutation queue</td>
					</tr>
				</tbody>
			</table>
		</section>
	{/if}

	<hr />

	<details>
		<summary>Debug</summary>
		<pre>Cache: {JSON.stringify(cacheState, null, 2)}</pre>
		<pre>Collection: {JSON.stringify(collectionState, null, 2)}</pre>
		<pre>LiveQuery: {liveQuery.status} ({liveQuery.data.length} items)</pre>
	</details>
</article>

<style>
	article {
		margin: 0.5rem;
	}
	section {
		margin-block: 2rem;
		opacity: 0.5;
	}
	section[data-active='true'] {
		opacity: 1;
	}
</style>
