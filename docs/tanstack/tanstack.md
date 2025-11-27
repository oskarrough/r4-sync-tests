# TanStack DB

Exploring TanStack DB as potential PGlite replacement. Goal: reactive collections with IndexedDB persistence + remote sync via @radio4000/sdk.

## How the pieces fit together

```
┌─────────────────────────────────────────────────────────────────────┐
│  Component                                                          │
│    useLiveQuery() ──────────────► Reactive UI                       │
│    trackActions.addTrack() ─┐                                       │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  @tanstack/offline-transactions                                     │
│    offlineExecutor.createOfflineTransaction()                       │
│      1. tx.mutate() → optimistic update to collection               │
│      2. tx.commit() → queue to IndexedDB outbox                     │
│      3. when online → call mutationFn (sdk.tracks.createTrack)      │
│      4. on success → remove from outbox                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  @tanstack/svelte-db + @tanstack/query-db-collection                │
│    createCollection(queryCollectionOptions({...}))                  │
│      - syncMode: 'on-demand' → fetch when query needs data          │
│      - queryFn → calls @radio4000/sdk                               │
│      - getKey → identifies items by id                              │
│    collection.insert/update/delete → in-memory changes              │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  @tanstack/svelte-query (QueryClient)                               │
│    - Coordinates data fetching between client and server (Supabase) │
│    - staleTime: 1-5min → data is "fresh", no refetch on re-render   │
│    - gcTime: 24h → how long unused data stays in memory before GC   │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  idb-keyval (persistence)                                           │
│    - persistTracksToIDB() → save collection snapshot                │
│    - hydrateTracksFromIDB() → restore on page load                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Packages

- `@tanstack/svelte-db` - Core reactive collections, exports `useLiveQuery()`, `createCollection()`, `eq`
- `@tanstack/query-db-collection` - Collection that syncs via TanStack Query (`queryCollectionOptions`, `parseLoadSubsetOptions`)
- `@tanstack/svelte-query` - Provides QueryClient
- `@tanstack/offline-transactions` - Outbox pattern for offline mutations (`startOfflineExecutor`, `IndexedDBAdapter`)
- `idb-keyval` - Simple key-value storage for collection persistence

## Offline transactions

The outbox pattern ensures zero data loss during offline periods:

1. Mutation persists to IndexedDB outbox first
2. Optimistic update applied to collection
3. Server sync when online (via mutationFn → sdk)
4. Remove from outbox on success

```typescript
export const offlineExecutor = startOfflineExecutor({
	collections: {tracks: tracksCollection, channels: channelsCollection},
	storage: new IndexedDBAdapter('r5-offline', 'transactions'),
	mutationFns: {
		syncTracks: async ({transaction}) => {
			for (const mutation of transaction.mutations) {
				switch (mutation.type) {
					case 'insert': await sdk.tracks.createTrack(channelId, mutation.modified); break
					case 'update': await sdk.tracks.updateTrack(mutation.modified.id, mutation.changes); break
					case 'delete': await sdk.tracks.deleteTrack(mutation.original.id); break
				}
			}
		},
		syncChannels: /* similar pattern */
	},
	onLeadershipChange: (isLeader) => console.log('leader:', isLeader),
	onStorageFailure: (diagnostic) => console.warn('storage failed:', diagnostic)
})

const tx = offlineExecutor.createOfflineTransaction({mutationFnName: 'syncTracks', metadata: {channelId}})
tx.mutate(() => tracksCollection.insert({id, url, title}))
await tx.commit()
```

Multi-tab: leader election ensures one tab manages outbox, others run online-only. Automatic failover.

Errors: throw `NonRetriableError` for permanent failures (422, validation), regular errors retry with exponential backoff.

## Key concepts

- `useLiveQuery()` returns reactive object with `isLoading`, `isError`, `error`, `data` properties
- Collections support `insert()`, `update()`, `delete()` with automatic optimistic updates
- Two mutation patterns: transaction-based (explicit commit) and action-based (auto-commit via `createOfflineAction`)
- Collection data persists to IDB via `idb-keyval`, hydrated on page load

## Architecture

```
Component
    ↓ trackActions.addTrack({url, title})
Offline Action (onMutate)
    ↓ tracksCollection.insert() → optimistic UI
    ↓ transaction queued to IDB
Offline Executor
    ↓ processes queue (immediate if online, retry if offline)
syncTracks()
    ↓ sdk.tracks.createTrack()
Supabase (remote)
    ↓ refetch on success
Collection updated
```

## Status

- [x] Read queries working (channels, tracks by slug)
- [x] On-demand sync mode with dynamic cache keys
- [x] Query cache persistence (IDB via persistQueryClient)
- [x] Offline mutations via @tanstack/offline-transactions
- [x] Offline action pattern (createTrackActions, createChannelActions)
- [x] Sync status component (online/offline indicator, pending transactions)
- [x] app_state equivalent (localStorage-based, same API as PGlite version)
- [x] Channel mutations (create/update/delete channel)

## Usage inside R5

- `src/routes/tanstack/collections.ts` - Collections, executor, track/channel actions
- `src/routes/tanstack/app-state.svelte.ts` - App state (localStorage, same API as PGlite)
- `src/routes/tanstack/sync-status.svelte` - Online/offline + pending transactions UI
- `src/routes/tanstack/tracks/+page.svelte` - Tracks CRUD test
- `src/routes/tanstack/channels/+page.svelte` - Channels CRUD test

## References

- https://tanstack.com/db/latest/docs/overview.md
- https://github.com/TanStack/db/issues/82 (offline-first discussion)
- https://github.com/TanStack/db/tree/main/packages/offline-transactions
- https://tanstack.com/blog/tanstack-db-0.1-the-embedded-client-database-for-tanstack-query.md
- https://tanstack.com/blog/tanstack-db-0.5-query-driven-sync#respects-your-cache-policies
- https://tanstack.com/db/latest/docs/collections/electric-collection.md
- https://tanstack.com/db/latest/docs/collections/local-storage-collection
- https://tanstack.com/db/latest/docs/collections/query-collection.md
- https://tanstack.com/db/latest/docs/guides/error-handling.md
- https://tanstack.com/db/latest/docs/guides/live-queries.md
- https://tanstack.com/db/latest/docs/guides/mutations.md
- https://tanstack.com/query/latest/docs/framework/svelte/overview
- https://frontendatscale.com/blog/tanstack-db/
