# TanStack DB

Exploring TanStack DB as potential PGlite replacement. Goal: reactive collections with localStorage persistence + remote sync via @radio4000/sdk.

## Packages

- `@tanstack/svelte-db` - Core reactive collections, exports `useLiveQuery()`, `createCollection()`
- `@tanstack/query-db-collection` - Collection that syncs via TanStack Query
- `@tanstack/svelte-query` - Provides QueryClient

## Key concepts

- `useLiveQuery()` returns reactive object (not a store, no `$` prefix needed)
- Collections support `insert()`, `update()`, `delete()` with automatic optimistic updates
- `onInsert/onUpdate/onDelete` handlers persist to backend, rollback on error
- `localStorageCollectionOptions` for browser persistence (potential offline support)

## Architecture (target)

```
UI ←→ TanStack Collection (optimistic state)
         ↓ onInsert/onUpdate/onDelete
      @radio4000/sdk
         ↓
      Supabase (remote)
         ↓ sync back via refetch
      Collection updated
```

## Status

- [x] Read queries working (channels, tracks by slug)
- [x] On-demand sync mode with dynamic cache keys
- [ ] Mutation handlers (onInsert, onUpdate, onDelete)
- [ ] localStorage persistence
- [ ] Test offline → online sync
- [ ] app_state equivalent (single row preferences)

## References

- https://tanstack.com/db/latest/docs/mutations
- https://tanstack.com/query/latest/docs/framework/svelte/overview
- https://tanstack.com/db/latest/docs/collections/query-collection
- https://tanstack.com/db/latest/docs/collections/local-storage-collection
- https://tanstack.com/blog/tanstack-db-0.5-query-driven-sync#respects-your-cache-policies
