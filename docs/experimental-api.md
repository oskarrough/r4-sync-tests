# r5 experimental api

source-first api for music data.
`src/lib/experimental-api`

## Sources

- $lib/db -> Local Postgres db
- $lib/r4 -> Remote Postgres via Supabase (v2)
- `channels-firebase-modified.json` -> Local v1 Firebase export (legacy channels)
- `./cli-r5.ts` -> CLI

## API

Most methods follow the pattern `r5.<resource>[.<source>]([<params>])`.

```
channels [local|r4|pull] [slug] 	- read channels
tracks local [slug], r4|pull <slug> - read tracks
search [channels|tracks] <query>    - search channels & tracks
pull <slug>                         - pull channels with tracks
db [reset|migrate|export]           - database operations
```

## examples

```js
import {r5} from '$lib/experimental-api'
await r5.channels({limit: 50})
await r5.tracks({slug: 'ko002', limit: 100})
await r5.channels.r4({limit: 50}) // fetch without inserting
await r5.tracks.v1({channel: 'ko002', firebase: 'id', limit: 100})
await r5.channels.pull({slug: 'optional-slug', limit: 50}) // fetch all/single, insert, return
await r5.tracks.pull({slug: 'required-slug', limit: 50}) // pulls tracks for a single channel (requires slug), insert, return
await r5.pull('ko002') // convenience, pulls channel+tracks, returns local data
```

## On-demand tracks

Tracks are not included the `pull()` method, but loaded on-demand when user interacts with the channel.

schema:

- app_state: single row, all ui/player state
- channels: radio stations with metadata
- tracks: music tracks linked to channels
- play_history: track playback events
- track_meta: youtube/musicbrainz enrichment
- followers: channel following relationships
