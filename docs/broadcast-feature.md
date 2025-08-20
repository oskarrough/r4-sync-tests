# Broadcast Feature

Real-time synchronized listening. Start broadcasting = others can join your stream.

## Data flow

- Local: `app_state.broadcasting_channel_id` (your status), `app_state.listening_to_channel_id` (who you're listening to)
- Remote: `broadcast` table in Supabase (channel_id, track_id, track_played_at)

## Key behaviors

- Starting broadcast: Creates remote row, updates local state via realtime
- Stopping broadcast: Deletes remote row, UI updates immediately then reloads list
- Joining broadcast: Syncs track locally if needed, starts playback at correct position
- Track changes while broadcasting: Auto-updates remote broadcast row
- Stale broadcasts (>10min): Rejected when joining

## Files

- `src/lib/broadcast.js` - Core logic, remote ops, sync
- `src/routes/broadcasts/+page.svelte` - Broadcasts list, realtime updates
- `src/lib/components/broadcast-controls.svelte` - Start/stop UI
- `src/lib/components/live-broadcasts.svelte` - Header indicator
