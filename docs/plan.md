# PLAN

List of possible improvements to the architecture, idea, cli and web application.
Verify and evaluate todos before taking them on. They might be outdated or just not good ideas.

## BACKLOG

### Test: Cross-collection querying with recent tracks

Prove that TanStack DB enables querying across all loaded data (not just per-slug cache blobs).

Create a test component at `/tanstack/recent-tracks/+page.svelte` that:

1. Shows the 50 most recent tracks **across all loaded channels**
2. Uses `useLiveQuery` with `gt(tracks.created_at, ...)` and `orderBy(..., 'desc')`
3. Should work once multiple channels have been visited (their tracks loaded into collection)

This demonstrates DB's value over Query alone: Query caches `['tracks', 'starttv']` and `['tracks', 'blink']` as separate blobs you can't query across. DB's collection lets you query all in-memory tracks with SQL-like syntax.

```js
const recentTracks = useLiveQuery((q) =>
	q
		.from({tracks: tracksCollection})
		.orderBy(({tracks}) => tracks.created_at, 'desc')
		.limit(50)
)
```

---

- Tracks inside <tracklist> aren't highlighted/marked when they are loaded in player? appState.playback_track === track.id?
- Refine offline error handling: In `syncTracks` and `syncChannels`, use `NonRetriableError` from `@tanstack/offline-transactions` for server-side validation errors (e.g., HTTP 4xx) to prevent unnecessary retries.
- add an url param to directly queueplay a track. maybe slug?play=trackid
- implement password reset flow (supabase auth)
- share buttons/embeds (evaluate if needed)
- local file player for mp3/m4a uploads
- add validation layer at sync boundaries (remote->local) using lib like zod 4
- allow users to mark a musicbrainz or discogs meta track data as wrong. Since we auto-match on the track title, there's a relatively high chance it's wrong. If it's wrong, users can delete the meta data for that track. But then it'd just match it again on reload. How do we deal with this, do we spend effort on this?
- run `bun run check` and slowly get rid of these warnings - tidy codebase
- What should happen when you play a track that is not part of the current loaded playlist? Replace playlist (with what?)? Just play, ignore playlist?
- analyze https://svelte.dev/docs/svelte/$effect#When-not-to-use-$effect - keep up with Svelte 5 patterns
- group metadata enrichment functions (youtube, musicbrainz) under single namespace "metadata" instead of "sync" - better organization
- consider integrating "bandsintown" as a third-party API similar to musicbrainz, youtube meta - rich data connections
- V1 compatibility: v1 channels can't be followed/broadcasted because remote supabase doesn't know about their foreign keys. V1 channels have firebase_id but don't exist in remote postgres, causing FK constraint failures. Solution ideas: use string-based IDs instead of proper foreign keys, or create placeholder records in remote for v1 channels.
- rethink the methods and naming in lib/api vs lib/player/api
- enhance logger: expose store.logs in devtools ui
- create standardized loading/error boundaries for async operations in ui
- find a way to share `track_meta` data between users. push it remote, how? security?
- improve broadcast feature

### Error: useLiveQueryPatched.svelte.ts

Tanstack DB API changed between versions. The patched hook was written for an older API.

| Line          | Error                                                               |
| ------------- | ------------------------------------------------------------------- |
| 11            | `LiveQueryCollection` not exported (now `LiveQueryCollectionUtils`) |
| 27, 28, 45-47 | `Type 'T' does not satisfy constraint 'object'`                     |
| 36            | `Type 'unknown' is not assignable`                                  |
| 66            | `createLiveQueryCollection` signature changed                       |

**Fix options:**

1. Update generics to `T extends object` and fix imports to match current Tanstack API
2. Pin to older Tanstack version (not recommended)
3. Remove patch if upstream fixed the `state_unsafe_mutation` issue — check if still needed

---

### Error: offline-executor.ts

`onTransactionComplete` callback was removed from Tanstack's `OfflineConfig` type.

```ts
_executor = startOfflineExecutor({
  onTransactionComplete: (tx) => offlineLog.info('complete', ...),  // ← doesn't exist
```

**Fix options:**

1. Check Tanstack offline-transactions docs for replacement callback (maybe renamed?)
2. Remove the logging callback if no equivalent exists
3. Use a different hook point if available (e.g., wrap mutationFns)
