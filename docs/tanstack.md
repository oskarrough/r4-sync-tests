# TanStack DB

Minimal setup for testing TanStack DB as potential PGlite replacement.

- `@tanstack/svelte-db` - Core reactive collections for Svelte, exports `useLiveQuery()`
- `@tanstack/query-db-collection` - Collection that syncs via TanStack Query (needs QueryClient)
- `@tanstack/svelte-query` - Provides QueryClient (only needed for query collections)
- `useLiveQuery()` returns reactive object (not a store, no `$` prefix needed)

## References

- https://tanstack.com/query/latest/docs/framework/svelte/overview
- https://tanstack.com/db/latest/docs/collections/query-collection
- https://tanstack.com/blog/tanstack-db-0.5-query-driven-sync#respects-your-cache-policies
