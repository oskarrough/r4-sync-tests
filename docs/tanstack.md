# TanStack DB

Exploring TanStack DB as potential PGlite replacement. Goal: reactive collections with IndexedDB persistence + remote sync via @radio4000/sdk.

## Packages

- `@tanstack/svelte-db` - Core reactive collections, exports `useLiveQuery()`, `createCollection()`
- `@tanstack/query-db-collection` - Collection that syncs via TanStack Query
- `@tanstack/svelte-query` - Provides QueryClient
- `@tanstack/query-persist-client-core` - Persist query cache to storage
- `@tanstack/offline-transactions` - Outbox pattern for offline mutations

## Offline transactions

The outbox pattern ensures zero data loss during offline periods:

1. Mutation persists to IndexedDB outbox first
2. Optimistic update applied to collection
3. Server sync when online (via mutationFn → sdk)
4. Remove from outbox on success

```typescript
const offline = startOfflineExecutor({
	collections: {tracks: tracksCollection},
	mutationFns: {
		syncTracks: async ({transaction, idempotencyKey}) => {
			await sdk.tracks.createTrack(transaction.mutations[0])
		}
	},
	onLeadershipChange: (isLeader) => {
		/* multi-tab: only leader persists */
	}
})

const tx = offline.createOfflineTransaction({mutationFnName: 'syncTracks'})
tx.mutate(() => tracksCollection.insert({id, url, title}))
await tx.commit()
```

Multi-tab: leader election ensures one tab manages outbox, others run online-only. Automatic failover.

Errors: throw `NonRetriableError` for permanent failures (422, validation), regular errors retry with exponential backoff.

## Key concepts

- `useLiveQuery()` returns reactive object (not a store, no `$` prefix needed)
- Collections support `insert()`, `update()`, `delete()` with automatic optimistic updates
- Offline actions wrap mutations: `onMutate` does optimistic update, executor queues to IDB
- Query cache persists to IDB via `persistQueryClient`

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

## Files

- `src/routes/tanstack/collections.ts` - Collections, executor, track/channel actions
- `src/routes/tanstack/app-state.svelte.ts` - App state (localStorage, same API as PGlite)
- `src/routes/tanstack/sync-status.svelte` - Online/offline + pending transactions UI
- `src/routes/tanstack/tracks/+page.svelte` - Tracks CRUD test
- `src/routes/tanstack/channels/+page.svelte` - Channels CRUD test

## References

- https://tanstack.com/db/latest/docs/mutations
- https://tanstack.com/query/latest/docs/framework/svelte/overview
- https://tanstack.com/db/latest/docs/collections/query-collection
- https://tanstack.com/db/latest/docs/collections/local-storage-collection
- https://tanstack.com/blog/tanstack-db-0.5-query-driven-sync#respects-your-cache-policies
- https://github.com/TanStack/db/tree/main/packages/offline-transactions
- https://github.com/TanStack/db/issues/82 (offline-first discussion)
