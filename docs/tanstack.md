# TanStack DB

Minimal setup for testing TanStack DB as potential PGlite replacement.

- `@tanstack/svelte-db` - Core reactive collections for Svelte, exports `useLiveQuery()`
- `@tanstack/query-db-collection` - Collection that syncs via TanStack Query (needs QueryClient)
- `@tanstack/svelte-query` - Provides QueryClient (only needed for query collections)
- `useLiveQuery()` returns reactive object (not a store, no `$` prefix needed)
