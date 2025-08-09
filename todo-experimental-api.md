# experimental-api design

designing a better SDK structure with clear, composable commands

## current structure analysis

the api is currently organized by concern:

- `db` - database operations (local pglite)
- `sync` - data synchronization (orchestrates pulling from multiple sources)
- `api` - application operations
- `player` - playback control
- `broadcast` - live broadcasting
- `liveQuery` - reactive queries
- `appState` - state management
- `v1` - legacy firebase data import (pullV1Channels, pullV1Tracks)
- `r4` - radio4000 sdk wrapper (channels, users, broadcasts from supabase)
- utils, dates, focus, keyboard, spam, types

### data source complexity

we're dealing with three data sources:

1. **local pglite** - primary interface, all reads/writes
2. **remote supabase** (via @radio4000/sdk) - v2 data, public reads, auth writes
3. **firebase export** (/r5-channels.json) - legacy v1 data, read-only

current flow: writes go remote → pull to local → read from local

## verb semantics

established meanings:

- **pull** = fetch from remote + insert to local db
- **query** = read from local db
- **read** = fetch from remote, no local insert
- **search** = fuzzy/cross-type user-facing queries
- **push** = send local to remote
- **add** = insert to local collection
- **set** = replace entire value
- **toggle** = flip boolean state

## evolution: verb-first → source-first

**old approach (verb-first):**

```js
r5.pull.channels() // verb first, source implied
r5.query.channels() // verb first, source implied
```

**new approach (source-first):**

```js
r5.channels() // resource first, local by default
r5.channels.remote() // resource first, source explicit
r5.channels.pull() // resource first, verb modifier
```

## design principles

- **source-first thinking** - organize by resource, not verb
- **flat structure** - minimal nesting for unix-like simplicity
- **explicit network calls** - clear when async/network happens
- **configurable defaults** - common case should be simple
- **predictable performance** - local by default, explicit remote
- **search ≠ query** - search is fuzzy/user-facing, query is structured data access

## key decisions

- **source-first** - `r5.channels()` not `r5.query.channels()`
- **flat structure** - minimal nesting, unix-like
- **configurable defaults** - `r5.channels()` behavior is configurable
- **explicit network calls** - `.remote()`, `.pull()`, `.sync()` are clearly async
- **v1 hybrid** - bulk migrate channels, lazy-load tracks
- **search ≠ query** - search is fuzzy/cross-type, query is structured data access
- **defer followers/broadcasts** - focus on core first

## source-first architecture (simplified)

after iteration, a cleaner source-first approach with unified pull:

```js
const r5 = {
  // resources (source-first, flat)
  channels: {
    (): queryLocal,           // r5.channels() - local by default
    local: queryLocal,        // r5.channels.local() - explicit local
    remote: fetchRemote,      // r5.channels.remote() - fetch only, no store
    pull: pullAndReturn,      // r5.channels.pull() - fetch all sources + store + return
    v1: checkV1Fallback,      // r5.channels.v1() - check firebase availability
  },

  tracks: {
    (): queryLocal,           // local by default
    local: queryLocal,
    remote: fetchRemote,
    pull: pullAndReturn,      // fetch + store + return
    v1: lazyLoadFromFirebase, // lazy-load tracks from firebase json
  },

  // stateful operations (not source-dependent)
  player: {
    play: {
      track: playTrack,
      channel: playChannel,
      resume: play,
    },
    pause: pause,
    next: next,
    prev: previous,
    stop: eject,
  },

  queue: {
    add: addToPlaylist,
    set: setPlaylist,
    clear: () => setPlaylist([]),
    shuffle: toggleShuffle,
  },

  search: searchGlobal,       // cross-type fuzzy search

  // setup/migration (one-time ops)
  migrate: {
    v1: {
      channels: migrateV1Channels,  // bulk import once
      schema: migrateDatabase,
    }
  },


  // database access
  db: {
    pg: pg,                   // direct pglite access
    export: exportDb,
    reset: resetDatabase,
  }
}
```

### benefits of source-first

1. **mental model alignment** - think "where is data coming from?" not "what verb?"
2. **discoverability** - `r5.channels.` shows all channel operations
3. **performance clarity** - `.remote()`, `.pull()`, `.sync()` clearly indicate network
4. **configurable defaults** - `r5.channels()` behavior can be tuned
5. **flat structure** - less nesting, more unix-like

### v1 hybrid approach

- **channels**: bulk migrate once with `r5.migrate.v1.channels()`
- **tracks**: lazy-load on demand with `r5.tracks.v1(channelId)`
- **unified access**: `r5.tracks(channelId)` checks local, falls back to v1

### usage patterns

```js
// common case - local data (fast)
const channels = await r5.channels()
const tracks = await r5.tracks({channel: 'oskar'})

// explicit remote fetch
const fresh = await r5.channels.remote()
const synced = await r5.channels.sync() // pull + return

// configuration
r5.config.defaultSource = 'local' // or 'remote' for always-fresh

// migration (one-time)
await r5.migrate.v1.channels()
```

## next steps

the source-first approach is a significant shift from our original verb-first design, but aligns better with developer mental models and unix philosophy.

**immediate next:**

1. prototype this structure in `src/lib/experimental-api.js`
2. test ergonomics with a few real component examples
3. figure out the callable object pattern for `r5.channels()`
4. validate the v1 hybrid approach works in practice

**open questions:**

1. how to implement callable objects? `r5.channels()` + `r5.channels.remote()`
2. should `r5.config.defaultSource` affect all resources or be per-resource?
3. error handling patterns across the different source methods?
