# IDB Collection Plan

A TanStack DB collection that persists to IndexedDB with on-demand remote sync.

## Goals

- Local-first: IDB is persistence layer
- On-demand sync: query predicates drive what gets fetched (like queryCollectionOptions)
- Delta loading: only fetch new/changed items, not everything
- Instant mutations: persist to IDB immediately, sync to remote in background
- No query cache conflicts - collection + IDB are the cache
- Works with TanStack DB's differential dataflow

## Key Insight

The power of `queryCollectionOptions` is **predicate push-down**:

```lisp
;; Component declares what it needs
(use-live-query
  (where (eq tracks.slug "darjeeling"))
  (order-by tracks.created-at :desc)
  (limit 50))

;; Collection's queryFn receives these predicates
(query-fn (ctx)
  ;; ctx.meta.loadSubsetOptions contains: slug, limit, createdAfter
  ;; Fetch ONLY what's needed
  (supabase.from "channel_tracks"
    (eq "slug" slug)
    (gt "created_at" last-synced)
    (limit 50)))
```

We want to keep this, but persist results to IDB instead of query cache.

## API Sketch (pseudo-lisp)

```lisp
(define tracks-collection
  (create-collection
    (idb-collection-options
      :id "tracks"
      :storage-key "r5-tracks"
      :get-key (lambda (item) item.id)

      ;; On-demand remote fetch - receives query predicates
      :query-fn (lambda (ctx)
        (let [opts (parse-load-subset-options ctx.meta.load-subset-options)
              slug (find-filter opts "slug")
              limit (get opts :limit)
              ;; Delta: only fetch newer than what we have locally
              cached (idb-get-newest-timestamp slug)
              created-after (or cached nil)]
          (supabase.from "channel_tracks"
            (select "*")
            (eq "slug" slug)
            (when created-after (gt "created_at" created-after))
            (order "created_at" :desc)
            (limit limit))))

      ;; Mutation handlers - sync single item to remote
      :on-insert (lambda (tx)
        (sdk.tracks.create-track tx.channel-id tx.modified)
        ;; Don't refetch! Item already in collection + IDB
        {:refetch false})

      :on-update (lambda (tx)
        (sdk.tracks.update-track tx.id tx.changes)
        {:refetch false})

      :on-delete (lambda (tx)
        (sdk.tracks.delete-track tx.id)
        {:refetch false}))))

;; Sync config handles IDB persistence
(define-sync
  ;; On startup: hydrate from IDB
  (on-init
    (let [cached (idb-get "r5-tracks")]
      (write-batch (map write-insert cached))
      (mark-ready)))

  ;; After queryFn returns: merge into collection + persist
  (on-remote-data (data)
    (write-batch (map write-upsert data))
    (idb-set "r5-tracks" (collection.to-array)))

  ;; After local mutation: persist immediately
  (on-local-mutation (mutations)
    (confirm-operations mutations)
    (idb-set "r5-tracks" (collection.to-array))))
```

## Data Flow

```
STARTUP
────────────────────────────────────────────────────────
IDB ──hydrate──> Collection ──ready──> UI renders cached data
                                       │
                                       └──> Queries trigger on-demand fetch
                                            (only if stale/missing)

QUERY (on-demand)
────────────────────────────────────────────────────────
useLiveQuery(slug="x", limit=50)
       │
       ├──> Check collection: have 50 items for slug "x"?
       │    ├── YES + fresh → return from collection (no fetch)
       │    └── NO or stale → call queryFn with predicates
       │                            │
       │                            ↓
       │                      Remote API (delta only)
       │                            │
       │                            ↓
       │                      Merge into collection
       │                            │
       │                            ↓
       └──────────────────────> Persist to IDB

MUTATION
────────────────────────────────────────────────────────
collection.insert(track)
       │
       ├──> Optimistic update (instant, in-memory)
       │
       ├──> Persist to IDB (async, fire-and-forget)
       │
       └──> on-insert → Remote API (background)
                        Returns {refetch: false}
                        (no cascade!)
```

## Key Differences from queryCollectionOptions

| queryCollectionOptions | idbCollectionOptions |
|------------------------|----------------------|
| Query cache persistence | IDB persistence |
| Cache restore overwrites optimistic updates | No conflict |
| invalidateQueries causes refetch cascade | {refetch: false} - no cascade |
| Loses data on cache clear | IDB survives |

## What We Keep from queryCollectionOptions

- `syncMode: 'on-demand'` - queries drive fetching
- `parseLoadSubsetOptions` - predicate push-down
- `staleTime` - don't refetch if fresh
- Differential dataflow - fast in-memory queries

## Implementation Approach

Option A: Wrap queryCollectionOptions
- Use queryCollectionOptions internally
- Intercept cache operations to also write to IDB
- Hydrate from IDB before query cache
- Complex, fighting the abstraction

Option B: Fork localStorageCollectionOptions
- Start from simpler base
- Add queryFn + predicate handling from queryCollectionOptions
- Cleaner, but more code

Option C: Compose at usage level (pragmatic)
- Keep queryCollectionOptions as-is
- Remove persistQueryClient (no query cache persistence)
- Manually persist collection.toArray to IDB after mutations
- Manually hydrate on startup via writeInsert
- Less elegant, but works now

## Recommended: Option C (pragmatic)

```typescript
// On startup - hydrate from IDB before queries run
const cached = await get('r5-tracks')
if (cached) {
  tracksCollection.utils.writeBatch(() => {
    cached.forEach(t => tracksCollection.utils.writeInsert(t))
  })
}

// After mutation - persist (in onInsert/onUpdate/onDelete)
onInsert: async ({transaction}) => {
  await sdk.tracks.createTrack(...)
  // Persist collection to IDB
  await set('r5-tracks', tracksCollection.toArray)
  return {refetch: false}
}
```

This gets us working today. Can refactor to proper idbCollectionOptions later.

## Open Questions

- Per-slug IDB keys? `r5-tracks-${slug}` - probably yes for large channels
- Cross-tab sync? BroadcastChannel if needed
- Garbage collection? Remove old tracks from IDB periodically
