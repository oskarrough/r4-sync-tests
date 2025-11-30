# TanStack DB

Exploring TanStack DB as potential PGlite replacement. Goal: reactive collections with offline-first mutations + remote sync via @radio4000/sdk.

## Terminology

Understanding what's from TanStack vs what we invented:

| Term                               | Source   | What it is                                                                 |
| ---------------------------------- | -------- | -------------------------------------------------------------------------- |
| **Collection**                     | TanStack | Reactive data store (`tracksCollection`)                                   |
| **Mutation**                       | TanStack | Single change: `insert`, `update`, or `delete`                             |
| **Transaction**                    | TanStack | Batch of mutations that commit together                                    |
| **Live Query**                     | TanStack | `useLiveQuery()` - reactive query that updates UI                          |
| **Operation Handler**              | TanStack | `onInsert/onUpdate/onDelete` on collection - auto-fires on mutations       |
| **Optimistic Action**              | TanStack | `createOptimisticAction()` - named operation with optimistic update + sync |
| **Manual Transaction**             | TanStack | `createTransaction()` - explicit commit control                            |
| **Offline Transaction**            | TanStack | `createOfflineTransaction()` - persists to IndexedDB outbox first          |
| **Offline Executor**               | TanStack | `startOfflineExecutor()` - manages outbox, leader election, retry          |
| **mutationFn**                     | TanStack | Function that syncs a transaction to the server                            |
| `syncTracks`                       | **Ours** | Our mutationFn name - dispatches to SDK by mutation type                   |
| `addTrack/updateTrack/deleteTrack` | **Ours** | Standalone functions that create offline transactions                      |

## Two mutation approaches in TanStack DB

### 1. Collection handlers (simple, not offline-safe)

Collections can have `onInsert/onUpdate/onDelete` that auto-fire:

```ts
const todoCollection = createCollection({
	onInsert: async ({transaction}) => {
		await api.create(transaction.mutations[0].modified)
	}
})

todoCollection.insert({id, text}) // fires onInsert automatically
```

Nicer API, but online-only. Mutations fail if offline.

### 2. Offline transactions (what we use)

More verbose, but works offline. We omit handlers on our collection and wrap all mutations in offline transactions.

Wrap mutations in outbox pattern for offline-first:

```ts
const tx = executor.createOfflineTransaction({mutationFnName: 'syncTracks'})
tx.mutate(() => tracksCollection.insert(newTrack))
await tx.commit()
```

1. Persist to IndexedDB outbox first (durable)
2. Apply optimistic update to collection (instant UI)
3. Sync to server when online (via mutationFn)
4. Remove from outbox on success

We chose this approach because r5 is offline-first.

## How our pieces connect

```
┌─────────────────────────────────────────────────────────────────────┐
│  Component (tracks/+page.svelte)                                    │
│    const tracks = useLiveQuery(...)      → reactive reads           │
│    addTrack(channel, {url, title})       → writes                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  addTrack / updateTrack / deleteTrack (OURS)                        │
│    Standalone functions that:                                       │
│      1. Create offline transaction                                  │
│      2. Call collection.insert/update/delete inside tx.mutate()     │
│      3. Commit transaction                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  offlineExecutor (TanStack)                                         │
│    startOfflineExecutor({                                           │
│      collections: {tracks: tracksCollection},                       │
│      mutationFns: {syncTracks: ...},  ← name we chose               │
│      storage: IndexedDBAdapter        ← outbox persistence          │
│    })                                                               │
│    - Queues transactions in IndexedDB                               │
│    - Leader election (one tab syncs)                                │
│    - Processes queue when online                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  syncTracks (OURS - the mutationFn)                                 │
│    Receives transaction with mutations array                        │
│    Dispatches by mutation.type:                                     │
│      insert → sdk.tracks.createTrack()                              │
│      update → sdk.tracks.updateTrack()                              │
│      delete → sdk.tracks.deleteTrack()                              │
│    Invalidates query cache on success                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  @radio4000/sdk                                                     │
│    Actual Supabase calls                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Why standalone action functions

TanStack gives us `createOfflineTransaction()` but it's low-level. We wrap it in simple functions:

```ts
// Our wrapper - addTrack(channel, input)
export function addTrack(channel: {id: string; slug: string}, input: {url: string; title: string}) {
	const tx = offlineExecutor.createOfflineTransaction({
		mutationFnName: 'syncTracks',
		metadata: {channelId: channel.id, slug: channel.slug},
		autoCommit: false
	})
	tx.mutate(() => {
		tracksCollection.insert({
			id: crypto.randomUUID(),
			url: input.url,
			title: input.title,
			slug: channel.slug,
			created_at: new Date().toISOString()
		})
	})
	return tx.commit()
}

// Usage in component
await addTrack(userChannel, {url, title})
```

One call handles all three concerns:

```
addTrack(channel, {url, title})
    │
    ├─► tx.mutate(() => tracksCollection.insert(...))  ← optimistic (instant UI)
    │
    ├─► tx.commit()  ← persists to IndexedDB outbox (offline-safe)
    │
    └─► offlineExecutor processes queue
            │
            └─► syncTracks({transaction})  ← calls sdk.tracks.createTrack() (remote)
```

1. **Optimistic**: `tracksCollection.insert()` updates UI immediately
2. **Offline**: Transaction queued in IndexedDB before anything else
3. **Remote**: `syncTracks` dispatches to SDK when online

## The mutationFn (syncTracks)

This is the bridge between TanStack's transaction and our SDK:

```ts
mutationFns: {
  syncTracks: async ({transaction, idempotencyKey}) => {
    for (const mutation of transaction.mutations) {
      const channelId = transaction.metadata?.channelId
      switch (mutation.type) {
        case 'insert':
          await sdk.tracks.createTrack(channelId, mutation.modified)
          break
        case 'update':
          await sdk.tracks.updateTrack(mutation.modified.id, mutation.changes)
          break
        case 'delete':
          await sdk.tracks.deleteTrack(mutation.original.id)
          break
      }
    }
    // Invalidate cache to refetch fresh data
    await queryClient.invalidateQueries({queryKey: ['tracks', ...]})
  }
}
```

The name `syncTracks` is arbitrary - we chose it. TanStack just needs a string key to look up the function.

## Packages

| Package                          | What it provides                                                  |
| -------------------------------- | ----------------------------------------------------------------- |
| `@tanstack/svelte-db`            | `createCollection()`, `useLiveQuery()`, `eq`                      |
| `@tanstack/query-db-collection`  | `queryCollectionOptions()`, `parseLoadSubsetOptions()`            |
| `@tanstack/svelte-query`         | `QueryClient`                                                     |
| `@tanstack/offline-transactions` | `startOfflineExecutor()`, `IndexedDBAdapter`, `NonRetriableError` |

## Caching

| Setting     | Where             | Value  | Purpose                             |
| ----------- | ----------------- | ------ | ----------------------------------- |
| `staleTime` | Collection        | 24h/1h | Background refetch threshold        |
| `staleTime` | `prefetchQuery()` | 24h    | Must set explicitly (default 0!)    |
| `gcTime`    | QueryClient       | 24h    | In-memory lifetime                  |
| `maxAge`    | persistence       | 24h    | IDB lifetime (must be >= staleTime) |

## Debugging

Collections are exposed on `window.r5` for console inspection:

```js
window.r5.channelsCollection.state          // Map of all channels
[...window.r5.channelsCollection.state.values()]  // As array
window.r5.channelsCollection.get('some-id') // By ID

window.r5.tracksCollection.state
[...window.r5.tracksCollection.state.values()]

window.r5.queryClient  // TanStack Query client
```

## Key behaviors

- **Leader election**: Only one tab processes the outbox (prevents duplicate syncs)
- **Retry with backoff**: Failed syncs retry automatically
- **NonRetriableError**: Throw this for permanent failures (422, validation errors)
- **Idempotency keys**: Prevent duplicate processing on reload

## Direct Writes (seeding without sync)

Bypass mutation handlers, write directly to synced data store. No optimistic mutations, no handler triggers.

```ts
collection.utils.writeInsert(item) // insert only
collection.utils.writeUpsert(item) // insert or update
collection.utils.writeUpdate(item) // update only
collection.utils.writeDelete(id) // delete
collection.utils.writeBatch(() => {
	// atomic batch
	items.forEach((i) => collection.utils.writeUpsert(i))
})
```

Use for: seeding on login, WebSocket updates, large dataset pagination.

## Status

- [x] Read queries working (tracks by slug)
- [x] On-demand sync mode with dynamic cache keys
- [x] Offline mutations via @tanstack/offline-transactions
- [x] Domain actions (`addTrack`, `updateTrack`, `deleteTrack`)
- [x] Sync status component (pending transactions count)
- [x] Channel collection + actions (`createChannel`, `updateChannel`, `deleteChannel`)
- [x] IDB hydration for offline-first startup (query-persist-client-core)

## Files

- `src/routes/tanstack/collections.ts` - collections, offlineExecutor, sync functions, action functions
- `src/routes/tanstack/persistence.ts` - query cache persistence to IndexedDB
- `src/routes/tanstack/sync-status.svelte` - Pending transactions UI
- `src/routes/tanstack/tracks/+page.svelte` - Tracks CRUD
- `src/routes/tanstack/channels/+page.svelte` - Channels CRUD

## References

You can fetch these with .md suffix for pure markdown.
http://localhost:5173/tanstack/channelaude

- https://tanstack.com/db/latest/docs/overview.md
- https://tanstack.com/db/latest/docs/guides/mutations.md
- https://github.com/TanStack/db/tree/main/packages/offline-transactions.md
- https://tanstack.com/db/latest/docs/collections/query-collection.md
- https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient.md
