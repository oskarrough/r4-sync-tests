<script>
	import {demoAPI, demoCollection} from '$lib/tanstack/collections/demo'
	import {createQuery} from '@tanstack/svelte-query'
	import {queryClient} from '$lib/tanstack/collections/query-client'
	import {browser} from '$app/environment'
	import {demoStats} from './demo-stats.svelte'

	if (browser) {
		// @ts-ignore
		window.r5tanstackdemo = {queryClient, demoCollection, demoAPI}
	}

	/** @type {import('$lib/tanstack/collections/demo').DemoTodo[] | null} */
	let fetchResult = $state(null)
	let isFetching = $state(false)

	/** @type {import('$lib/tanstack/collections/demo').DemoTodo[] | null} */
	let cachedResult = $state(null)

	async function justFetch() {
		isFetching = true
		fetchResult = await demoAPI.fetchTodos(3, 0)
		isFetching = false
	}

	async function fetchWithCache() {
		cachedResult = await demoAPI.fetchQuery()
	}

	function reset() {
		demoStats.networkRequests = 0
		demoStats.cacheHits = 0
		fetchResult = null
		cachedResult = null
		cacheUpdated = false
		cacheInvalidated = false
		enableReactiveQuery = false
		demoAPI.clearCache()
		demoAPI.clearCollection()
	}

	let isInvalidating = $state(false)
	let cacheInvalidated = $state(false)

	async function invalidateCache() {
		isInvalidating = true
		await queryClient.invalidateQueries({queryKey: ['todos-cached']})
		isInvalidating = false
		cacheInvalidated = true
	}

	// Section 4: External cache update
	let cacheUpdated = $state(false)

	function simulateCacheUpdate() {
		const currentData = queryClient.getQueryData(['todos-cached'])
		if (!currentData) return
		queryClient.setQueryData(
			['todos-cached'],
			[{id: 9999, todo: '→ Added via setQueryData', completed: false, userId: 1}, ...currentData]
		)
		cacheUpdated = true
	}

	// Section 4: Reactive queries - same query key as section 2!
	// Only enable after user has interacted with caching (section 2)
	let enableReactiveQuery = $state(false)
	const reactiveQuery = createQuery(() => ({
		queryKey: ['todos-cached'],
		queryFn: () => demoAPI.fetchTodos(3, 0),
		staleTime: 60 * 1000,
		enabled: browser && enableReactiveQuery
	}))

	// Section 7: Collections
	let collectionItems = $derived([...demoCollection.state.values()])
	/** @type {import('$lib/tanstack/collections/demo').DemoTodo[] | undefined} */
	let cacheData = $derived(queryClient.getQueryData(['todos-cached']))

	async function populateCollection() {
		let data = cacheData
		if (!data?.length) {
			data = await demoAPI.fetchQuery()
		}
		demoAPI.writeToCollection(data)
	}
</script>

<article class="SmallContainer">
	<h1>TanStack Query + DB</h1>
	<p>Interactive exploration of TanStack's data fetching and caching abstractions.</p>

	<section>
		<h2>1. Just fetch</h2>
		<p>Fetch data from an API. Pass it to a template. Render HTML.</p>
		<p>
			<button onclick={justFetch} disabled={isFetching}>fetch('/todos')</button>
			{#if demoStats.networkRequests > 0}
				<mark>Network requests: {demoStats.networkRequests}</mark>
				<button onclick={reset}>Reset</button>
			{/if}
		</p>
		{#if isFetching && demoStats.networkRequests === 0}
			<p>Loading...</p>
		{/if}
		{#if demoStats.networkRequests > 0}
			<ul>
				{#each fetchResult as todo (todo.id)}
					<li>{todo.todo}</li>
				{/each}
			</ul>
			<p>This works. Not every app needs more.</p>
			<p>Click again and observe the network request count.</p>
			<p>Each click fetches from the network. We already had this data. Why fetch again?</p>
		{/if}
	</section>

	<section>
		<h2>2. Client-side cache</h2>
		<p>
			Fetching the same data repeatedly wastes bandwidth. Wrap your fetch in <code>fetchQuery</code> and TanStack Query
			caches responses in memory by <code>queryKey</code>.
		</p>
		<p>
			<button onclick={fetchWithCache}>fetchQuery('/todos')</button>
			{#if demoStats.cacheHits > 0}
				<mark>Cache hits: {demoStats.cacheHits}</mark>
			{/if}
		</p>
		{#if cachedResult?.length}
			<ul>
				{#each cachedResult as todo (todo.id)}
					<li>{todo.todo}</li>
				{/each}
			</ul>
			<p>Click again. Network requests stay the same - data comes from cache.</p>
		{/if}
		<pre>queryClient.fetchQuery(&#123;
  queryKey: ['todos-cached'],
  queryFn: () => fetchTodos(3, 0),
  staleTime: 60 * 1000
&#125;)</pre>
	</section>

	<section>
		<h2>3. Cache invalidation</h2>
		<p>
			Data now lives in two places: the remote API (source of truth) and locally in memory (not persisted). When to
			fetch vs use cache? You configure it once, then the query client handles every call:
		</p>
		<ul>
			<li>
				<code>staleTime</code> - how long until data is considered stale. Fresh data is returned from cache without fetching.
			</li>
			<li><code>gcTime</code> - how long to keep data in memory before garbage collecting it entirely.</li>
		</ul>
		<pre>fetchQuery({'{'} staleTime: 60_000, gcTime: 300_000 {'}'})</pre>
		<p>Invalidate the cache manually. Then click the button in section 2 - it will fetch again.</p>
		<p>
			<button onclick={invalidateCache} data-loading={isInvalidating} disabled={isInvalidating}
				>invalidateQueries(['todos-cached'])</button
			>
			{#if cacheInvalidated}
				<mark>Cache invalidated. Now try section 2 again.</mark>
			{/if}
		</p>
	</section>

	<section>
		<h2>4. Reactive queries</h2>
		<p>
			<code>createQuery</code> (from @tanstack/svelte-query) returns a reactive object. Unlike <code>fetchQuery</code>,
			it fetches automatically and watches the cache for changes.
		</p>
		{#if !enableReactiveQuery}
			<button onclick={() => (enableReactiveQuery = true)}>Enable reactive query</button>
		{:else}
			<p>This list uses the same query key as section 2:</p>
			{#if reactiveQuery.isLoading}
				<p>Loading...</p>
			{:else if reactiveQuery.isError}
				<p>Error: {reactiveQuery.error?.message}</p>
			{:else if reactiveQuery.data?.length}
				<ul>
					{#each reactiveQuery.data as todo (todo.id)}
						<li>{todo.todo}</li>
					{/each}
				</ul>
			{/if}
		{/if}
		<pre>const query = createQuery(() => ({'{'}
  queryKey: ['todos-cached'],
  queryFn: () => fetchTodos(3, 0),
  staleTime: 60 * 1000
{'}'}))

// query.data - reactive, updates when cache changes
// query.isLoading, query.isError, query.error</pre>
	</section>

	<section>
		<h2>5. Comparing behaviors</h2>
		<p>Section 2 and 4 both use the same cache key <code>['todos-cached']</code>. Now update the cache directly:</p>
		<p>
			<button onclick={simulateCacheUpdate} disabled={cacheUpdated}
				>setQueryData(['todos-cached'], [newTodo, ...old])</button
			>
		</p>
		{#if cacheUpdated}
			<p>Section 4 (createQuery) updated immediately. Section 2 (fetchQuery) didn't.</p>
			<p>Click fetchQuery in section 2 - now it shows the new item too.</p>
			<p>Same cache, different behavior:</p>
			<ul>
				<li><code>fetchQuery</code> - you ask, you receive, done</li>
				<li><code>createQuery</code> - you subscribe, updates flow to you</li>
			</ul>
			<p>Which do you want? Both are valid. Depends on your use case.</p>
		{/if}
	</section>

	<section>
		<h2>6. Writes (the hard way)</h2>
		<p>Reading is solved. What about writes?</p>
		<p>
			TanStack Query provides <code>createMutation</code>. It works, but optimistic updates require boilerplate:
		</p>
		<pre>createMutation({'{'}
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {'{'}
    await queryClient.cancelQueries(...)
    const previous = queryClient.getQueryData(...)
    queryClient.setQueryData(..., newTodo)
    return {'{'} previous {'}'}
  {'}'},
  onError: (err, newTodo, context) => {'{'}
    queryClient.setQueryData(..., context.previous)
  {'}'},
  onSettled: () => {'{'}
    queryClient.invalidateQueries(...)
  {'}'}
{'}'})</pre>
		<p>
			Cancel queries, snapshot previous, update cache, rollback on error, refetch on settle. Every. Single. Mutation.
		</p>
		<p>Coming soon: interactive demo.</p>
	</section>

	<section>
		<h2>7. Collections</h2>
		<p>
			TanStack DB introduces <strong>Collections</strong> - typed, queryable data stores. Let's move data from the Query cache
			into a collection.
		</p>

		<div class="two-col">
			<div>
				<h3>Query Cache</h3>
				<code>['todos-cached']</code>
				<p>{cacheData?.length ?? 0} items</p>
				{#if cacheData?.length}
					<ul>
						{#each cacheData as todo (todo.id)}
							<li>{todo.todo}</li>
						{/each}
					</ul>
				{:else}
					<p><small>Empty. Try section 2 first.</small></p>
				{/if}
			</div>
			<div>
				<h3>Collection</h3>
				<code>demoCollection</code>
				<p>{collectionItems.length} items</p>
				{#if collectionItems.length}
					<ul>
						{#each collectionItems as todo (todo.id)}
							<li>{todo.todo}</li>
						{/each}
					</ul>
				{:else}
					<p><small>Empty.</small></p>
				{/if}
			</div>
		</div>

		<p>
			<button onclick={populateCollection} disabled={collectionItems.length > 0}>
				{cacheData?.length ? 'Populate collection from cache' : 'Fetch & populate collection'}
			</button>
		</p>

		{#if collectionItems.length}
			<p>Same data, different abstraction. The cache stores blobs by key. The collection is a queryable Map.</p>
		{/if}
	</section>

	<section>
		<h2>8. Live Queries</h2>
		<p>
			<code>useLiveQuery</code> lets you query collections with SQL-like syntax. Filter, join, aggregate - all client-side,
			sub-millisecond.
		</p>
		<pre>const {'{'} data {'}'} = useLiveQuery((q) =>
  q.from({'{'} todo: todoCollection {'}'})
   .join({'{'} project: projectCollection {'}'}, ...)
   .where(({'{'} todo {'}'}) => eq(todo.completed, false))
)</pre>
		<p>Live queries are reactive - when underlying data changes, they update automatically.</p>
		<p>Coming soon: interactive live query demo.</p>
	</section>

	<section>
		<h2>9. Transactional Mutations</h2>
		<p>
			Collections support <code>insert</code>, <code>update</code>, <code>delete</code>. They're optimistic by default
			and auto-rollback on error.
		</p>
		<pre>// Immediately updates UI, syncs in background
todoCollection.update(todo.id, (draft) => {'{'}
  draft.completed = true
{'}'})
// If onUpdate fails, rolls back automatically</pre>
		<p>No boilerplate. No manual cache management. No rollback logic.</p>
		<p>Coming soon: interactive mutation demo.</p>
	</section>

	<section>
		<h2>10. Persistence</h2>
		<p>Memory cache disappears on refresh. Collections can persist to localStorage or IndexedDB.</p>
		<pre>createCollection(
  localStorageCollectionOptions({'{'}
    storageKey: 'my-todos',
    getKey: (item) => item.id
  {'}'})
)</pre>
		<p>Coming soon: persistence demo.</p>
	</section>

	<section>
		<h2>11. Sync</h2>
		<p>Pair TanStack DB with a sync engine (ElectricSQL, TrailBaze, Firebase) for:</p>
		<ul>
			<li>Real-time updates across clients</li>
			<li>Offline-first with automatic sync when online</li>
			<li>Efficient delta updates (only fetch what changed)</li>
		</ul>
		<p>The database becomes the source of truth. Changes sync automatically.</p>
		<p>Coming soon: sync engine integration.</p>
	</section>

	<section>
		<h2>12. The full picture</h2>
		<p>TanStack DB fills the gaps in TanStack Query:</p>
		<ul>
			<li><strong>Collections</strong> - typed, relational data</li>
			<li><strong>Live Queries</strong> - reactive, SQL-like, sub-ms filtering</li>
			<li><strong>Transactional Mutations</strong> - optimistic by default, auto-rollback</li>
		</ul>
		<p>Adopt incrementally. Start with Query, add DB when you need it. No backend changes required.</p>
	</section>
</article>

<style>
	article {
		padding-bottom: 10vh;

		h2,
		p,
		ul {
			margin: 1rem 0;
		}
		h2 {
			font-size: var(--font-7);
		}
		pre {
			background: var(--gray-2);
			padding: 1rem;
			overflow-x: auto;
		}
		button {
			background: var(--accent-9);
			color: var(--accent-1);
		}
	}
	section {
		margin-block: 6vh;
	}
	.two-col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
</style>
