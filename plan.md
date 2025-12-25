# PLAN

List of possible improvements to the architecture, idea, cli and web application.
Verify and evaluate todos before taking them on. They might be outdated or just not good ideas.

## BACKLOG

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
- rethink channel date display: replace "341 days ago" with value-neutral presentation. Old channels aren't stale - they're archives, curated collections. Consider: just showing the year ("2019"), hiding time entirely and only surfacing recency in discovery contexts ("new this week" in feeds), or seasonal labels. The date is provenance, not a freshness indicator. Some of the best mixtapes are old.
- if you visit a channel and thereby load its tracks, then mutate a track outside of the app (e.g. in another browser, device), the cached tracks won't necessarily update afaik. how to deal with this? 

### track-card perf improvements

Potential bottlenecks when rendering 3k+ tracks:

- **extractYouTubeId per card**: regex parsing runs for each track. Consider caching results or moving to track sync time.
- **PopoverMenu per card**: 3k popover instances in DOM even if not visible. Lazy-render only when opened?
- **LinkEntities per description**: parses/transforms text for each track description. Could batch or cache.
- **active state**: `appState.playlist_track` check runs on all cards when current track changes. Move check to parent, only pass boolean to playing track.

### Test cross-collection querying with recent tracks

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

### track-card perf improvements

Potential bottlenecks when rendering 3k+ tracks:

- extractYouTubeId per card: regex parsing runs for each track. Consider caching results or moving to track sync time. We really should set this whenever URL is updated server-side.
- \*\*LinkEntities per description: parses/transforms text for each track description. Could batch or cache.
- PopoverMenu per card: 3k popover instances in DOM even if not visible. Lazy-render only when opened? Maybe fine as is, since its native
- active state: `appState.playlist_track` check runs on all cards when current track changes. Move check to parent, only pass boolean to playing track.

### Test cross-collection querying with recent tracks

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
