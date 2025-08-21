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
