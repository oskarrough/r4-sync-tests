# Sync

synchronization between local pglite database and remotes

We have three different data sources.

- /r5-channels.json -> Local v1 Firebase export (legacy channels)
- @radio4000/sdk -> Remote Postgres via Supabase (v2)
- $lib/db -> Local Postgres db

## Sync flow

- dual database pattern: remote postgres via supabase, local postgres via pglite
- writes remote, reads local with on-demand pulling
- transaction-based upserts with proper conflict resolution
- chunked processing (50 tracks) prevents browser blocking

```
pullChannels()/pullChannel()
pullTracks()
needsUpdate()
sync() - orchestrates parallel channel pulling from both sources
```

## On-demand tracks

Tracks are not included the `sync()` method, but loaded on-demand when user interacts with the channel. Then we call: `pullTracks(slug)` or `pullV1Tracks(id, firebase_id)`

schema:

- app_state: single row, all ui/player state
- channels: radio stations with metadata
- tracks: music tracks linked to channels
- play_history: track playback events
- track_meta: youtube/musicbrainz enrichment
- followers: channel following relationships


/src/lib/sync.js: remote/local synchronization

- pullchannels/pulltracks from supabase
- on-demand track loading
- chunked processing (50 tracks)
- legacy v1 firebase import

