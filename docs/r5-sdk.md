# r5 sdk

This sdk/api wraps v1 (firebase), r4 (supabase) with r5 (local) into one, unified API. The idea is that you only need to use this to interact with data from all sources:

- $lib/db -> Local Postgres db
- $lib/r4 -> Remote Postgres via Supabase (v2)
- `channels-firebase-modified.json` -> Local v1 Firebase export (legacy channels)
- `./cli-r5.ts` -> CLI

Most methods follow the pattern `r5.<resource>[.<source>]([<params>])`.

```
channels [local|r4|pull|v1] [slug]     - read channels
tracks local [slug], r4|pull <slug>|v1 - read tracks
search [channels|tracks] <query>        - search channels & tracks
db [reset|migrate|export]               - database operations
```

## examples

```js
import {r5} from '$lib/r5'
await r5.channels.local({limit: 50})
await r5.tracks.local({slug: 'ko002', limit: 100})
await r5.channels.r4({limit: 50}) // fetch without inserting
await r5.channels.v1({slug: 'ko002'}) // fetch v1/firebase channels
await r5.tracks.v1({channel: 'ko002', firebase: 'id', limit: 100})
await r5.channels.pull({slug: 'optional-slug', limit: 50}) // fetch all/single, insert, return
await r5.tracks.pull({slug: 'required-slug', limit: 50}) // pulls tracks for a single channel (requires slug), insert, return
```
