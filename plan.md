# PLAN

List of possible improvements to the architecture, idea, cli and web application.
Verify and evaluate todos before taking them on. They might be outdated or just not good ideas.

## BACKLOG

- On-demand predicate push-down: we set `syncMode: 'on-demand'` but don't use `parseLoadSubsetOptions` in queryFn. Currently we manually check for slug and call different SDK methods. With proper on-demand, live query `where()` clauses flow through to backend:
  ```ts
  const {where} = parseLoadSubsetOptions(ctx.meta.loadSubsetOptions)
  const filters = extractSimpleComparisons(where)
  const slugFilter = filters.find((f) => f.field[0] === 'slug')
  if (slugFilter) return fetchTracksBySlug(slugFilter.value)
  ```
  Benefit: add date range or search filters in UI, they flow to SDK without touching queryFn dispatch.
- Seek/position support: add `seekTo(seconds)`, `getPosition()` via media-chrome player. Support `?t=` URL param like YouTube for deep-linking into tracks.
- add validation layer at sync boundaries (remote->local) using lib like zod 4 shared types from sdk?
- what should happen when you play a track that is not part of the current loaded playlist? Replace playlist (with what?)? Just play, ignore playlist?
- v1 compatibility: v1 channels can't be followed/broadcasted because remote supabase doesn't know about their foreign keys. V1 channels have firebase_id but don't exist in remote postgres, causing FK constraint failures. Solution ideas: use string-based IDs instead of proper foreign keys, or create placeholder records in remote for v1 channels.
- create standardized loading/error boundaries for async operations in ui
- share buttons/embeds (evaluate if needed)
- improve broadcast feature
- run `bun run check` and slowly get rid of these warnings - tidy codebase
- map-picker.svelte: fix to work with channel update flow

## Questionable backlog

- allow users to mark a musicbrainz or discogs meta track data as wrong. Since we auto-match on the track title, there's a relatively high chance it's wrong. If it's wrong, users can delete the meta data for that track. But then it'd just match it again on reload. How do we deal with this, do we spend effort on this?
- local file player for mp3/m4a uploads
- find a way to share `track_meta` data between users. push it remote, how? security?
- consider integrating "bandsintown" as a third-party API similar to musicbrainz, youtube meta - rich data connections

### track-card perf improvements

Potential bottlenecks when rendering 3k+ tracks:

- extractYouTubeId per card: regex parsing runs for each track. Consider caching results or moving to track sync time. We really should set this whenever URL is updated server-side.
- LinkEntities per description: parses/transforms text for each track description. Could batch or cache.
- PopoverMenu per card: 3k popover instances in DOM even if not visible. Lazy-render only when opened? Maybe fine as is, since its native
- active state: `appState.playlist_track` check runs on all cards when current track changes. Move check to parent, only pass boolean to playing track.
