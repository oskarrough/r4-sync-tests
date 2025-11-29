# PLAN

List of possible improvements to the architecture, idea, cli and web application.
Verify and evaluate todos before taking them on. They might be outdated or just not good ideas.

# BACKLOG

- **Implement cache persistence for offline startup:** Explore using `@tanstack/query-persist-client` to hydrate collections from IndexedDB on page load. This would provide an instant, offline-first UI.
- **Create `channelsCollection`:** Add a new collection for managing channels, including offline-first actions for create, update, and delete, similar to the existing `tracksCollection`.
- **Refine offline error handling:** In `syncTracks` and future sync functions, use `NonRetriableError` from `@tanstack/offline-transactions` for server-side validation errors (e.g., HTTP 4xx) to prevent unnecessary retries.

- explore replacing pglite with tanstack db (branch #tanstackdb)
  - [x] basic read queries (channels, tracks by slug)
  - [x] mutation handlers for tracks (onInsert, onUpdate, onDelete)
  - [x] query cache behavior verified (staleTime, dynamic keys)
  - [x] app_state equivalent (localStorage-based, same API as PGlite version)
  - [x] sync status UI (online/offline, pending transactions)
  - [x] channel mutations (create/update/delete)
  - [x] query cache persistence (IDB via persistQueryClient)
  - [x] track mutations use metadata for channelId (cleaner API)
  - [x] real-world offline → online test (insert + update, verified FIFO order and ID consistency)
  - [x] SDK: createTrack accepts optional client-provided UUID (enables offline-first)
  - [ ] load user's channel into collection on auth (have userChannelId from appState, need to fetch into collection)

read
https://github.com/TanStack/db/issues/865
https://github.com/TanStack/db/issues/82
https://github.com/TanStack/db/pull/559
https://github.com/TanStack/db/blob/main/packages/offline-transactions/README.md
https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient
https://github.com/TanStack/db/issues/921 (our bug report: loadAndReplayTransactions called twice)

- explore replacing pglite with automerge v3
- consider https://turso.tech/blog/introducing-turso-in-the-browser to replace pgsql (tough performance at times)
- crud channels: create/edit/delete channel functionality
- crud tracks: edit/delete track functionality (we have add)
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
