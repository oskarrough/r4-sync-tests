# r5 sdk

Unified API for local (PGlite), remote (Supabase/r4), and legacy (Firebase/v1) data.

Pattern: `r5.<resource>.<source>({params})`

## Source methods

| Method | Behavior |
|--------|----------|
| `local({slug?, limit?})` | Query local PGlite |
| `r4({slug?, limit?})` | Fetch from Supabase (no insert) |
| `v1({slug?, limit?})` | Fetch from Firebase legacy |
| `pull({id?, slug?, limit?})` | Waterfall: local → r4 → v1, inserts, returns local |

## Examples

```js
import {r5} from '$lib/r5'

// Channels
await r5.channels.local({limit: 50})
await r5.channels.r4({slug: 'ko002'})
await r5.channels.pull({slug: 'ko002'})  // smart fetch + insert
await r5.channels.pull({id: 'uuid'})     // resolves ID to slug

// Tracks (requires slug or id)
await r5.tracks.local({slug: 'ko002', limit: 100})
await r5.tracks.pull({slug: 'ko002'})
await r5.tracks.pull({id: 'track-uuid'}) // resolves to channel slug

// Pull channel + tracks together
await r5.pull('ko002')

// Tags (local only, derived from track descriptions)
await r5.tags.local({slug: 'ko002', limit: 20})

// Search (local PGlite with pg_trgm)
await r5.search.all('ambient')           // channels + tracks
await r5.search.channels('ko002')
await r5.search.tracks('jazz')
await r5.search.all('@detecteve acid')   // scoped to channel
```
