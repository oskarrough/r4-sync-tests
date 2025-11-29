# Broadcast feature

Radio owners create "broadcasts" in R4.

`startBroadcast`, `stopBroadcast`

Listeners join, watch for track changes in the broadcast, plays, leaves

`joinBroadcast`, `leaveBroadcast`, `playBroadcastTrack`
`watchBroadcasts`

```
start: startBroadcast → upsertRemoteBroadcast → supabase
join:  joinBroadcast → playBroadcastTrack → (pull if needed) → startBroadcastSync
watch: watchBroadcasts → r4.broadcasts.readBroadcastsWithChannel → realtime updates
sync:  supabase change → realtime → playBroadcastTrack
auto:  playTrack → (if broadcasting) → upsertRemoteBroadcast → realtime → listeners
stop:  stopBroadcast → delete remote
```

## State

- `app_state.broadcasting_channel_id` - your broadcast
- `app_state.listening_to_channel_id` - who you're listening to
- `supabase.broadcast` - remote table with a "live channel"

## Files

- `broadcast.js` - core functions, pure data operations
- `broadcasts/+page.svelte` - broadcasts list page, manages state with $state()
- `broadcast-controls.svelte` - ui
- `live-broadcasts.svelte` - indicator

## Architecture

- `broadcast.js` contains pure functions, no state management
- `watchBroadcasts(onChange)` takes callback, uses `r4.broadcasts.readBroadcastsWithChannel()`
- Track loading happens in `playBroadcastTrack` when joining, not in list view
- Page component manages reactive state with Svelte 5 `$state()`

## Data access (TanStack)

Channel lookups use TanStack collections:

```js
import {channelsCollection, tracksCollection} from '$lib/tanstack/collections'

// Lookup channel by id
const channel = channelsCollection.get(channelId)

// Find channel by slug
const channel = [...channelsCollection.state.values()].find((ch) => ch.slug === slug)

// Lookup track and get its channel slug
const track = tracksCollection.get(trackId)
const slug = track?.slug
```

When a listener joins a broadcast and the track isn't in local cache, fetch via TanStack query invalidation or direct SDK call.

## Auto-update Behavior

When a broadcaster (user with `broadcasting_channel_id` set) changes tracks:

1. `playTrack()` is called (via next/previous buttons, auto-advance, etc.)
2. If `broadcasting_channel_id` exists and `startReason !== 'broadcast_sync'`, automatically calls `upsertRemoteBroadcast()`
3. Remote broadcast table updates with new `track_id` and `track_played_at`
4. Supabase realtime triggers for all listeners
5. Listeners receive update and play the new track via `playBroadcastTrack()`

This ensures broadcasts stay in sync automatically without manual intervention.

## Migration notes (PGlite → TanStack)

Previous PGlite patterns and their TanStack equivalents:

| PGlite                                                 | TanStack                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| `pg.sql\`SELECT \* FROM channels WHERE id = ${id}\``   | `channelsCollection.get(id)`                                  |
| `pg.sql\`SELECT slug FROM channels WHERE id = ${id}\`` | `channelsCollection.get(id)?.slug`                            |
| `r5.pull(slug)`                                        | `queryClient.invalidateQueries({queryKey: ['tracks', slug]})` |
| `trackIdToSlug(trackId)`                               | `tracksCollection.get(trackId)?.slug`                         |

The `startBroadcast` function needs channel source check - use `channelsCollection.get(channelId)?.source` instead of SQL query.
