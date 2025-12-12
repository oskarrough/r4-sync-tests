<script>
	import {demoAPI} from '$lib/tanstack/collections/demo'
	import LiveQueryDemo from './live-query-demo.svelte'
	/** @typedef {import('$lib/tanstack/collections/demo').DemoTodo} DemoTodo */

	let step = $state(1)
	/** @type {DemoTodo[] | null} */
	let lastResult = $state(null)
	let fetchCount = $state(0)
	let liveQueryEnabled = $state(false)

	// Manual state refresh (intentionally not reactive to show the problem)
	let cacheState = $state(demoAPI.getQueryCache())
	let collectionState = $state(demoAPI.getCollectionState())

	function refreshState() {
		cacheState = demoAPI.getQueryCache()
		collectionState = demoAPI.getCollectionState()
	}

	async function justFetch() {
		fetchCount++
		lastResult = await demoAPI.fetchTodos(5, 0)
	}

	async function fetchWithCache() {
		const hadCache = cacheState.length > 0 && !cacheState[0]?.isStale
		lastResult = await demoAPI.fetchQuery()
		if (!hadCache) fetchCount++
		refreshState()
	}

	async function fetchSecondBatch() {
		fetchCount++
		await demoAPI.fetchSecondBatch()
		refreshState()
	}

	function populateCollection() {
		const allCached = cacheState.flatMap((q) => q.data || [])
		demoAPI.writeToCollection(allCached)
		refreshState()
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
		refreshState()
	}
</script>

<article>
	<h1>The Evolution of State Management</h1>
	<p>An interactive exploration. Why do all these layers exist?</p>

	<nav>
		<button onclick={reset}>Reset demo</button>
		<small>Network requests: {fetchCount}</small>
	</nav>

	<hr />

	<!-- Step 1: Just Fetch -->
	<section data-active={step === 1}>
		<h2>1. Just fetch</h2>
		<p>Fetch data from an API. Pass it to a template. Render HTML. That's it.</p>

		<button onclick={justFetch}>fetch('/todos')</button>

		{#if lastResult?.length}
			<ul>
				{#each lastResult as todo (todo.id)}
					<li>{todo.todo}</li>
				{/each}
			</ul>
			<p><strong>This works.</strong> Not every app needs more.</p>
			<button onclick={nextStep}>But what if... →</button>
		{/if}
	</section>

	<!-- Step 2: The Problem -->
	{#if step >= 2}
		<section data-active={step === 2}>
			<h2>2. The problem</h2>
			<p>Go to another page and back. The fetch re-runs.</p>

			<button onclick={justFetch}>fetch('/todos') again</button>

			<pre>Network requests: {fetchCount}</pre>

			{#if fetchCount >= 2}
				<p>We already had this data. Why fetch again?</p>
				<p>
					<em>"Just fetch again"</em> works until it doesn't. On flaky networks, offline, or when you want snappy UX.
				</p>
				<button onclick={nextStep}>Enter caching →</button>
			{/if}
		</section>
	{/if}

	<!-- Step 3: Client-side Cache -->
	{#if step >= 3}
		<section data-active={step === 3}>
			<h2>3. Client-side cache</h2>
			<p>Store results locally. Return cached data if fresh.</p>

			<button onclick={fetchWithCache}>fetchQuery (cached)</button>
			<button onclick={fetchWithCache}>click again</button>

			<pre>Network requests: {fetchCount}
Cache: {cacheState.length ? `${cacheState[0]?.data?.length || 0} items` : 'empty'}</pre>

			{#if cacheState.length > 0}
				<p>Second click? <strong>No new request.</strong> Data came from cache.</p>
				<p>But now we duplicated the data! It lives in the API (source of truth) AND locally.</p>
				<button onclick={nextStep}>When do we use which? →</button>
			{/if}
		</section>
	{/if}

	<!-- Step 4: Stale Time -->
	{#if step >= 4}
		<section data-active={step === 4}>
			<h2>4. Cache invalidation</h2>
			<p>Two settings control cache behavior:</p>

			<ul>
				<li><strong>staleTime</strong> — how long before data is "old" → refetch</li>
				<li><strong>gcTime</strong> — how long before we throw away cached data</li>
			</ul>

			<pre>staleTime: 5 minutes
gcTime: 24 hours</pre>

			<p>Now reads automatically respect our preferences. Fresh? Use cache. Stale? Refetch.</p>
			<button onclick={nextStep}>But there's another problem →</button>
		</section>
	{/if}

	<!-- Step 5: Blobs Problem -->
	{#if step >= 5}
		<section data-active={step === 5}>
			<h2>5. The cache is just blobs</h2>
			<p>Load a second batch of todos:</p>

			<button onclick={fetchSecondBatch}>fetchQuery (batch 2)</button>

			{#if cacheState.length > 1}
				<pre>Cache entries:
  ["demo-todos"]: {cacheState[0]?.data?.length || 0} items
  ["demo-todos","batch2"]: {cacheState[1]?.data?.length || 0} items</pre>

				<p>Now try: "show ALL todos sorted by completion"</p>
				<p>
					<strong>You can't.</strong> Each query key is an opaque blob. The cache can't merge them, filter across them, or
					sort them together. It's a key-value store, not a database.
				</p>
				<button onclick={nextStep}>Enter collections →</button>
			{/if}
		</section>
	{/if}

	<!-- Step 6: Collections -->
	{#if step >= 6}
		<section data-active={step === 6}>
			<h2>6. Collections</h2>
			<p>A collection is an in-memory Map you can query. Merge all cached blobs into one store:</p>

			<button onclick={populateCollection}>cache → collection</button>

			<pre>Collection: {collectionState.size} items</pre>

			{#if collectionState.size > 0}
				<p><strong>{collectionState.size} items</strong>, queryable with SQL-like syntax:</p>
				<code>q.from(todos).where(t =&gt; t.completed).orderBy('id')</code>
				<p>But we did this manually. What keeps cache and collection in sync?</p>
				<button onclick={nextStep}>→</button>
			{/if}
		</section>
	{/if}

	<!-- Step 7: useLiveQuery -->
	{#if step >= 7}
		<section data-active={step === 7}>
			<h2>7. useLiveQuery</h2>
			<p>Bridges cache → collection automatically. Fetches if stale, populates collection, re-renders on changes.</p>

			<label>
				<input type="checkbox" bind:checked={liveQueryEnabled} />
				Enable useLiveQuery
			</label>

			{#if liveQueryEnabled}
				<LiveQueryDemo>
					<button onclick={nextStep}>→</button>
				</LiveQueryDemo>
			{/if}
		</section>
	{/if}

	<!-- Step 8: Writes Problem -->
	{#if step >= 8}
		<section data-active={step === 8}>
			<h2>8. What about writes?</h2>
			<p>Safest approach:</p>
			<ol>
				<li>Update via API (~400ms)</li>
				<li>Refetch to update cache (~200ms)</li>
			</ol>
			<p>Two network requests. 600ms before you see your change. Not using the cache we built.</p>

			<p>What if we could:</p>
			<ul>
				<li>Mutate locally (instant UI)</li>
				<li>Sync to API in background</li>
				<li>Rollback if rejected</li>
			</ul>

			<button onclick={nextStep}>Optimistic mutations →</button>
		</section>
	{/if}

	<!-- Step 9: Optimistic Mutations -->
	{#if step >= 9}
		<section data-active={step === 9}>
			<h2>9. Optimistic mutations</h2>
			<p>Write locally first. Queue mutations. Process when online. Rollback if rejected.</p>

			<button
				onclick={() => {
					demoAPI.insertTodo({todo: 'New todo ' + Date.now(), completed: false, userId: 1})
					refreshState()
				}}
			>
				Insert todo (optimistic)
			</button>

			<pre>Collection: {collectionState.size} items</pre>

			{#if collectionState.size > 20}
				<p><strong>Instant.</strong> In production, this syncs to the server in background.</p>
				<button onclick={nextStep}>Summary →</button>
			{/if}
		</section>
	{/if}

	<!-- Step 10: Summary -->
	{#if step >= 10}
		<section data-active={step === 10}>
			<h2>The full picture</h2>

			<pre>Read:  cache → stale? → fetch → update cache
Write: mutate locally → queue → process online → rollback if rejected</pre>

			<table>
				<thead>
					<tr>
						<th>Problem</th>
						<th>Solution</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Refetching data we have</td>
						<td>Cache</td>
					</tr>
					<tr>
						<td>When cache vs API?</td>
						<td>staleTime / gcTime</td>
					</tr>
					<tr>
						<td>Cache is opaque blobs</td>
						<td>Collections</td>
					</tr>
					<tr>
						<td>Keeping them in sync</td>
						<td>useLiveQuery</td>
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

			<p>Each layer solves a real problem. No layer exists "just because".</p>
		</section>
	{/if}

	<hr />

	<details>
		<summary>Debug state</summary>
		<pre>Cache: {JSON.stringify(cacheState, null, 2)}</pre>
		<pre>Collection: {JSON.stringify(collectionState, null, 2)}</pre>
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
