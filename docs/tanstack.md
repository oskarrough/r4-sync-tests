# TanStack DB

Exploring TanStack DB as potential PGlite replacement. Goal: reactive collections with IndexedDB persistence + remote sync via @radio4000/sdk.

## Packages

- `@tanstack/svelte-db` - Core reactive collections, exports `useLiveQuery()`, `createCollection()`
- `@tanstack/query-db-collection` - Collection that syncs via TanStack Query
- `@tanstack/svelte-query` - Provides QueryClient
- `@tanstack/query-persist-client-core` - Persist query cache to storage
- `@tanstack/offline-transactions` - Outbox pattern for offline mutations

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
- [x] Offline action pattern (createTrackActions)
- [ ] Test offline → online sync flow
- [ ] app_state equivalent (single row preferences)
- [ ] Channel mutations (create/update/delete channel)

## Files

- `src/routes/tanstack/collections.ts` - Collections, executor, actions
- `src/routes/tanstack/tracks/+page.svelte` - Tracks CRUD test
- `src/routes/tanstack/channels/+page.svelte` - Channels read test

## References

- https://tanstack.com/db/latest/docs/mutations
- https://tanstack.com/query/latest/docs/framework/svelte/overview
- https://tanstack.com/db/latest/docs/collections/query-collection
- https://tanstack.com/db/latest/docs/collections/local-storage-collection
- https://tanstack.com/blog/tanstack-db-0.5-query-driven-sync#respects-your-cache-policies
- https://github.com/TanStack/db/tree/main/packages/offline-transactions
- https://github.com/TanStack/db/issues/82 (offline-first discussion)
