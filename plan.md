# PLAN

List of possible improvements to the architecture, idea, cli and web application.
Verify and evaluate todos before taking them on. They might be outdated or just not good ideas.

# BACKLOG

- **Refine offline error handling:** In `syncTracks` and `syncChannels`, use `NonRetriableError` from `@tanstack/offline-transactions` for server-side validation errors (e.g., HTTP 4xx) to prevent unnecessary retries.

## TanStack DB experiment (branch #tanstackdb)

Core tracks/channels collections working. See `docs/tanstack/tanstack.md` for architecture.

### Migration: Remove PGlite dependency

**Done:**

- [x] Tracks collection (CRUD + offline mutations)
- [x] Channels collection (CRUD + offline mutations)
- [x] app_state (moved to $state + localStorage)
- [x] **Metadata enrichment** - `trackMetaCollection` using `localStorageCollectionOptions`
  - Created `trackMetaCollection` in `src/routes/tanstack/collections.ts`
  - Updated `src/lib/metadata/musicbrainz.js` to use collection
  - Updated `src/lib/metadata/youtube.js` to use collection
  - Updated `src/lib/metadata/discogs.js` to use collection
  - Added `getTrackWithMeta()` helper to merge track with metadata

**Remaining:**

- [x] **Track page reactivity** - Now uses `useLiveQuery` on `trackMetaCollection`, re-renders when metadata updates
- [ ] **r5 SDK** - `src/lib/r5/` still queries PGlite for local/r4/v1/pull pattern. Either deprecate or rewrite to use TanStack collections
- [x] **Search** - Now uses `fuzzysort` on TanStack collections in `src/lib/search.js`
- [x] **Tags** - `src/routes/[slug]/tags/+page.svelte` derives tags from tracks collection (old `src/lib/r5/tags.js` is dead code)
- [ ] **Followers** - needs `followersCollection`. Used in `src/lib/api.js` (followChannel, unfollowChannel, getFollowers, isFollowing) and `src/lib/r5/followers.js`
- [ ] **History** - needs `playHistoryCollection`. Used in `src/lib/api.js` (addPlayHistory) and `src/routes/history/+page.svelte`
- [ ] **Stats** - `src/routes/stats/+page.svelte` - derive from tracks/channels collections instead of SQL aggregation
- [x] **Queue** - already in app_state, no PGlite dependency
- [ ] **Broadcast** - `src/lib/broadcast.js` uses PGlite
- [x] **tracks_with_meta view** - no longer needed, removed dependency
- [x] **Player** - `src/lib/components/player.svelte` already uses TanStack collections
- [ ] **updateTrack/deleteTrack** - `src/lib/api.js` still uses `pg.sql`, should use TanStack mutations from collections.ts

### Routes using PGlite (need migration)

**Direct `pg.sql` queries:**

- [x] `src/routes/auth/+page.svelte` — migrated to `useLiveQuery` with `inArray`
- [x] `src/routes/[slug]/update/+page.svelte` — migrated to `useLiveQuery` with `eq`
- [x] `src/routes/[slug]/trackids/` — deleted +page.js, moved to `useLiveQuery` in svelte
- [ ] `src/routes/stats/+page.svelte:49,59,60` — raw SQL for stats aggregation
- [ ] `src/routes/history/+page.svelte:9,20` — play history queries
- [ ] `src/routes/playground/spam-warrior/` — multiple spam-related updates (low priority, playground)

**r5 SDK usage (depends on r5 SDK migration):**

- [x] `src/routes/search/+page.svelte` — uses `r5.search.all()` which now uses fuzzysort
- [ ] `src/routes/+layout.js:27-28` — `r5.db.migrate()`, `r5.db.getPg()`
- [x] `src/routes/create-channel/+page.svelte` — migrated to `channelsCollection.state.get()`
- [ ] `src/routes/[slug]/batch-edit/` — **Rebuild from scratch with TanStack**. Current version uses `r5.pull()` for sync + custom `batchEdit` staging system. With TanStack offline mutations, edits go directly to collection and sync automatically. Keep: filter logic, selection UX, TrackRow/EditsPanel components. Remove: manual pull/staging/commit flow.
- [x] `src/routes/[slug]/edit/+page.svelte` — migrated to `useLiveQuery`
- [x] `src/routes/[slug]/tracks/+page.svelte` — migrated to `useLiveQuery`
- [ ] `src/routes/recovery/+page.svelte:15-16` — `r5.db.reset()`, `r5.db.migrate()`

References:

- https://github.com/TanStack/db/issues/921 (our bug report: loadAndReplayTransactions called twice)
- https://tanstack.com/db/latest/docs/overview

## Other alternatives to explore

- explore replacing pglite with automerge v3
- consider https://turso.tech/blog/introducing-turso-in-the-browser to replace pgsql (tough performance at times)

## General backlog

- implement password reset flow (supabase auth)
- share buttons/embeds (evaluate if needed)
- local file player for mp3/m4a uploads
- refactor batch-edit feature (exists but needs work)
- add validation layer at sync boundaries (remote->local) using lib like zod 4
- allow users to mark a musicbrainz or discogs meta track data as wrong. Since we auto-match on the track title, there's a relatively high chance it's wrong. If it's wrong, users can delete the meta data for that track. But then it'd just match it again on reload. How do we deal with this, do we spend effort on this?
- run `bun run check` and slowly get rid of these warnings - tidy codebase (192 errors remaining, fixed PGlite query patterns)
- What should happen when you play a track that is not part of the current loaded playlist? Replace playlist (with what?)? Just play, ignore palyslist?
- analyze https://svelte.dev/docs/svelte/$effect#When-not-to-use-$effect - keep up with Svelte 5 patterns
- group metadata enrichment functions (youtube, musicbrainz) under single namespace "metadata" instead of "sync" - better organization
- move sync/followers into lib/r5 namespace. think hard about the the pullFollowers logic. Maybe get rid of `syncFollowers`, we use "pull" naming in other places. Is it because it doesn't overwrite local, but merge into local? seems hard. hmm
- consider integrating "bandsintown" as a third-party API similar to musicbrainz, youtube meta - rich data connections
- Test we can export browser pglite and import and verify that - solid foundation for experimentation
- V1 compatibility: v1 channels can't be followed/broadcasted because remote supabase doesn't know about their foreign keys. V1 channels have firebase_id but don't exist in remote postgres, causing FK constraint failures. Solution ideas: use string-based IDs instead of proper foreign keys, or create placeholder records in remote for v1 channels.
- implement backup/restore: export/import full pglite database as json or sql dump
- rethink the methods and naming in lib/api vs lib/player/api
- enhance logger: expose store.logs in devtools ui
- create standardized loading/error boundaries for async operations in ui
- find a way to share `track_meta` data between users. push it remote, how? security?
- improve broadcast feature
