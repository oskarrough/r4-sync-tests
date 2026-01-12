# Data flow bug: useLiveQuery stuck at "loading" on page reload

## Symptom

- Visit `/oskar` (or any `[slug]` route) - works fine
- Reload the page - stuck at "Loading..." forever
- No console errors
- HMR (hot reload) works fine, only full page reload breaks

## Root cause investigation

### What we know

1. `channelQuery.status` stays `loading`, never transitions to `ready`
2. `onFirstReady` callback never fires for the slug-filtered query
3. `preload()` promise never resolves (hangs forever)
4. No network request is made for the channel (queryFn never called)
5. The query cache HAS the data (`r5.queryClient.getQueryData(['channels', 'oskar'])` returns channel)
6. The base `channelsCollection.status` is `ready` with 1502 items

### The difference: HMR vs full reload

- **HMR**: Collections already populated in memory, no IDB restoration
- **Full reload**: Goes through `cacheReady` -> IDB restore -> manual hydration

### Suspect: Manual hydration in query-cache-persistence.ts (lines 66-79)

```ts
cacheReady.then(() => {
	// ...
	for (const channel of data) channelsCollection.state.set(channel.id, channel)
})
```

This directly sets items into `collection.state`, bypassing the on-demand sync mechanism's internal state tracking. The collection has data but the subset loading state machine doesn't know it was "loaded".

When `useLiveQuery` creates a `createLiveQueryCollection` with a slug filter:

1. It queries FROM `channelsCollection`
2. On-demand mode generates queryKey `['channels', 'oskar']`
3. The internal subset loading mechanism might be in a corrupted state
4. `preload()` waits for something that never happens

## Test: Disable manual hydration

Currently testing with hydration commented out in query-cache-persistence.ts.

## Affected queries

- `eq(channels.slug, slug)` -> queryKey `['channels', slug]` - BROKEN
- `orderBy().limit()` -> queryKey `['channels']` - WORKS (playground page)

The difference is specific subset loading vs full collection loading.

## Dependencies involved

- `@tanstack/db` - recently updated, changelog mentions race condition fixes
- `@tanstack/query-db-collection` - queryCollectionOptions, on-demand sync
- `@tanstack/svelte-db` - useLiveQuery hook
- Our patched `useLiveQuery.svelte.js`

## Files involved

- `src/lib/tanstack/query-cache-persistence.ts` - IDB cache restore + manual hydration
- `src/lib/tanstack/useLiveQuery.svelte.js` - our patched hook
- `src/lib/tanstack/collections/channels.ts` - channelsCollection with on-demand sync
- `src/routes/[slug]/+page.svelte` - the broken page

## Test results

- [x] Disable manual hydration - STILL BROKEN (not the cause)
- [x] Clear IDB cache (`indexedDB.deleteDatabase('keyval-store')`) - **WORKS!**

## Root cause: Persisted cache restoration

When queries are restored from IDB via `persistQueryClientRestore`, something in the restored query state confuses the on-demand sync. The live query collection thinks the subset is already loading but the promise never resolves.

## Pattern that works vs breaks

- `q.from({channels})` - no filter - queryKey `['channels']` - **WORKS**
- `q.from({channels}).where(eq(slug, x))` - queryKey `['channels', x]` - **BROKEN on restore**
- Fresh cache (no IDB) - **WORKS**

## Hypothesis

The `queryCollectionOptions` on-demand sync stores metadata in query state (like loading promises, subset tracking). When persisted and restored:

1. The metadata is partially restored (or stripped by our serialize function)
2. The live query collection checks this state
3. It thinks a load is in progress but the promise reference is gone
4. `preload()` waits forever for a promise that no longer exists

## Fix applied (partial)

- Bumped `buster` to '2' to invalidate broken caches
- Don't persist on-demand subset queries (`['channels', slug]`, `['tracks', slug]`)
- Only persist full collection queries (`['channels']`, `['tracks']`)

## Current issue

Even with `['channels']` cached and `channelsCollection.state` hydrated, the live query with `eq(slug, x)` still triggers an on-demand fetch. The on-demand sync doesn't check if data already exists in the parent collection.

**We want to persist both channels AND tracks** - the whole point of persistence is offline-first and fast loads.

## Problem summary

1. On-demand sync stores functions in query meta
2. Functions can't be serialized to IDB
3. On restore, functions are gone → on-demand sync breaks
4. `preload()` hangs forever waiting for a promise that no longer exists

## Possible solutions

1. **Don't use on-demand sync for channels** - we prefetch all at startup anyway
2. **Change how [slug] page queries** - filter from collection.state instead of live query with where()
3. **Fix TanStack DB** - on-demand sync should handle restored queries gracefully
4. **Different persistence strategy** - persist the collection state directly, not query cache?

## What we want

- Persist `['channels']` (all channels) ✓ working
- Persist `['tracks', slug]` (tracks per channel) ✗ broken on restore
- Fast page loads from cache
- No unnecessary network fetches

## Decision: Build interim collection persistence

TanStack DB is working on `persistedCollectionOptions` (see [#865](https://github.com/TanStack/db/issues/865)) which solves this properly. But it's not shipped yet.

**Our interim solution**: Persist collection state directly to IDB, separate from query cache.

### How it works

```
┌─────────────────────────────────────────────────────────────────┐
│  Query Cache (TanStack Query)                                   │
│    Persists: stale/fresh logic, refetch control                 │
│    Keys: ['channels'], ['tracks', slug]                         │
│    Problem: on-demand subset queries break on restore           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Collection State (our new IDB store)                           │
│    Persists: raw data only                                      │
│    Keys: 'r5-tracks', 'r5-channels'                             │
│    Restored BEFORE queries run → data already there             │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

Following TanStack's naming from #865 where it makes sense:

**Terminology:**

- `hydrate` - restore data from persistence into collection
- `PersistenceAdapter` - interface for save/restore (IDB implementation)
- `writeUpdate` not `writeInsert` - avoid duplicate key errors during hydration
- `collectionsHydrated` - promise that resolves when restore complete

**Single file:** `src/lib/tanstack/collection-query-cache-persistence.ts`

```ts
// Adapter interface (simplified from TanStack's PersistenceAdapter)
interface PersistenceAdapter {
  save(collectionId: string, data: Array<{id: string}>): Promise<void>
  restore(collectionId: string): Promise<Array<{id: string}> | null>
}

// IDB adapter using idb-keyval
const idbAdapter: PersistenceAdapter = { ... }

// Hydrate a collection from persistence (uses writeUpdate, not insert)
function hydrateCollection(collection, collectionId): Promise<void>

// Subscribe to collection changes, debounced save
function persistCollection(collection, collectionId): void

// Promise that resolves when all collections hydrated
export const collectionsHydrated: Promise<void>
```

**Flow:**

1. App loads → `collectionsHydrated` starts
2. Restore raw data from IDB for each collection
3. `writeUpdate` each item into collection (no duplicate key errors)
4. `collectionsHydrated` resolves
5. Layout awaits this before rendering
6. `useLiveQuery` finds data already in collection → no fetch

### Files to modify

- `src/lib/tanstack/collection-query-cache-persistence.ts` - **new**, all persistence logic
- `src/routes/+layout.svelte` - await `collectionsHydrated` alongside `cacheReady`

### What we persist

| Collection           | IDB Key                   | Hydrate on load | Persist on change |
| -------------------- | ------------------------- | --------------- | ----------------- |
| `tracksCollection`   | `r5-collections-tracks`   | ✓               | ✓ (debounced)     |
| `channelsCollection` | `r5-collections-channels` | ✓               | ✓ (debounced)     |

### Migration path

When TanStack ships `persistedCollectionOptions`, we:

1. Switch to official API
2. Remove our `collection-query-cache-persistence.ts`
3. Keep query cache persistence as-is

## Next steps

- [x] Create `collection-query-cache-persistence.ts` with IDB read/write
- [x] Hook into collection changes (subscribe to mutations)
- [x] Restore collection state on app load
- [x] Test: visit channel, reload, should show instantly

## Implementation summary

Created `src/lib/tanstack/collection-query-cache-persistence.ts`:

- Hydrates collections from IDB using direct `state.set()` (bypasses sync layer to avoid `SyncNotInitializedError`)
- Persists collection changes via polling + debounced writes
- Exports `collectionsHydrated` promise awaited in `+layout.js` before `cacheReady`

**Result**: Instant page loads from hydrated collection.state. The on-demand sync still triggers redundant network requests (it doesn't know about hydrated data), but UI renders immediately because `[slug]/+page.svelte` falls back to `collection.state` when available.

**Future**: When TanStack ships `persistedCollectionOptions` ([#865](https://github.com/TanStack/db/issues/865)), replace our interim solution with the official API.

## Implementation notes for future agent

### Key decisions to make

1. **Timing of hydration vs query cache restore**: `collectionsHydrated` should resolve BEFORE `cacheReady` matters, or at least before any `useLiveQuery` runs. Check `+layout.svelte` for current await order.

2. **Use `writeUpsert` not `writeUpdate`**: Safer for hydration - handles both insert-if-missing and update-if-exists.

3. **Debounce strategy for persisting**: Collection changes can be frequent (bulk track imports). Debounce writes to IDB (500ms-1s?). Consider `writeBatch` for hydration.

4. **What triggers persistence writes?** Options:
   - Subscribe to collection events (if available)
   - Poll `collection.state` on interval (wasteful)
   - Hook into our mutation functions (`addTrack`, `updateTrack`, etc.)
   - Use a Proxy or reactive subscription

5. **Collection state access**: `[...collection.state.values()]` gives all items. Check if collection has subscription/event API for changes.

### Gotchas to watch for

- **Circular import**: `collection-query-cache-persistence.ts` needs collections, collections might need persistence. May need to pass collections as params rather than import.

- **SSR**: This is browser-only. Guard with `browser` check from `$app/environment`.

- **Collection not ready**: We hit `SyncNotInitializedError` when calling `writeBatch` on idle collections. Hydration might need different approach - maybe direct `.state.set()` is fine for initial hydration since we're not going through sync layer?

- **Empty collections**: Don't persist empty arrays, don't try to hydrate from null/missing IDB keys.

- **Data shape**: Persisted data should match what collection expects. Tracks have `id`, `url`, `title`, `channel_id`, etc. Channels have `id`, `slug`, `name`, etc.

### Testing checklist

1. Fresh browser (no IDB) → visit `/oskar` → tracks load from network → check IDB has tracks
2. Reload → tracks appear instantly (no network) → verify from devtools Network tab
3. Visit different channel `/other` → new tracks load → both channels' tracks in IDB
4. Clear IDB manually → reload → should fetch fresh (graceful fallback)
5. Offline mode → reload → should show cached data
