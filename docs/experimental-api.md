# r5 experimental api

source-first api for music data. see implementation in `src/lib/experimental-api.js`.

## pattern

```
r5.<resource>[.<source>]([<params>])
```

resources: `channels`, `tracks`, `search`, `queue`, `db`  
sources: `local` (default), `r4` (radio4000 api), `v1` (firebase), `pull` (fetch+store+return)

## examples

```js
import {r5} from '$lib/experimental-api'

// local by default
await r5.channels()
await r5.tracks({channel: 'oskar'})

// explicit sources
await r5.channels.r4()        // fetch without storing
await r5.channels.pull()       // fetch all sources, store, return
await r5.tracks.v1({channel: 'oskar', firebase: 'id'})
```

## callable objects

functions with methods attached via `Object.assign`:

```js
r5.channels()         // calls localChannels
r5.channels.r4()      // calls remoteChannels
r5.search('query')    // calls performSearch
r5.search.tracks('q') // calls searchTracks
```

## data flow

```
r4/v1 --pull--> local(pglite) <--query-- app
```

- writes go remote (when authenticated)
- reads always local (instant)
- pull syncs remote to local

## non-obvious behaviors

- `pull()` returns data after storing (convenience over purity)
- `sync()` in code pulls both v1 and r4 channels
- tracks require channel slug for remote/pull operations
- v1 channels identified by `firebase_id` column presence
- search is fuzzy/user-facing, query is structured

## performance

- local: instant (browser postgres)
- r4: network round-trip
- v1: static json (fast, stale)
- pull: network + db write

## future

player api commented out, waiting for module. broadcasts, push operations, followers pending.