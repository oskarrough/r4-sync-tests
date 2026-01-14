# Ralph Loop Progress

## Iteration 1: Analysis & Planning

### Current Architecture Analysis

The codebase has a solid foundation with clear separation:

- **Collections** (TanStack DB): tracksCollection, channelsCollection - reactive stores
- **appState**: UI state (playlist, playback, theme)
- **API layer**: orchestrates between collections and player

### Pain Points Identified

1. **Queue operations scattered**: `queueNext`/`queuePrev` are pure, but playlist management lives in `api.js` (setPlaylist, addToPlaylist), mixed with side effects
2. **Track lookup by ID repeated everywhere**: `tracksCollection.get(id)` pattern scattered
3. **Playlist state implicit**: `playlist_tracks` vs `playlist_tracks_shuffled` chosen at runtime based on `appState.shuffle`
4. **Missing URL param for direct track playback** (from plan.md)
5. **Track highlighting not working** in tracklist when playing

### Proposed Improvements: Composable Music Operations

The goal: Lispy, pipe-like operations. Each function does ONE thing.

```js
// Current (imperative, scattered)
const ids = tracks.map((t) => t.id)
appState.playlist_tracks = ids
appState.playlist_tracks_shuffled = shuffleArray(ids)
playTrack(ids[0], null, 'play_channel')

// Proposed (composable)
pipe(tracksBySlug(slug), sortByCreated('desc'), toPlaylist, play)
```

### Implementation Plan

**Phase 1: Pure Queue Module** (`src/lib/player/queue.ts`)

- Extend existing pure functions
- Add: `queueFrom`, `queueInsertAfter`, `queueInsertAt`, `queueRemove`, `queueShuffle`
- Add: `queueSlice`, `queueRotate` for radio-like behavior

**Phase 2: Track Selectors** (`src/lib/selectors/tracks.ts`)

- Pure functions that operate on track arrays
- `bySlug`, `byId`, `sortByCreated`, `sortByTitle`, `filterByTag`

**Phase 4: Track Highlighting Fix**

- Pass `isPlaying` boolean to TrackCard
- Derive from `appState.playlist_track === track.id`

---

## Changes Made

### Iteration 1: Core Implementation

**New files created:**

1. `src/lib/selectors/tracks.ts` - Pure track selectors
   - `bySlug`, `byId`, `sortByCreated`, `sortByUpdated`, `sortByTitle`
   - `withTag`, `fromDomain`, `youtubeOnly`, `soundcloudOnly`
   - `withoutErrors`, `withErrors`, `take`, `skip`, `toIds`
   - `groupByYear`, `groupByMonth`, `searchTitle`, `search`
   - `createdAfter`, `createdBefore`, `count`, `some`, `every`, `pick`

2. `src/lib/selectors/index.ts` - Composable utilities
   - `pipe()` - pipe value through functions (left to right)
   - `compose()` - compose functions (right to left)
   - `selector()` - create reusable selector pipelines
   - Re-exports `tracks` and `queue` namespaces

**Extended:**

3. `src/lib/player/queue.ts` - 15 new pure queue operations
   - `queueFrom`, `queueInsertAfter`, `queueInsertAt`, `queueInsertManyAfter`
   - `queueRemove`, `queueRemoveMany`, `queueShuffle`, `queueShuffleKeepCurrent`
   - `queueTake`, `queueSkip`, `queueRotate`, `queuePosition`
   - `queueContains`, `queueMove`, `queueUnique`

4. `src/lib/index.ts` - Unified API surface
   - Clean re-exports of all major features
   - Collections, operations, selectors, search, broadcast
   - Ready for `import * as r5 from '$lib'`

**Features implemented:**

5. `src/lib/components/track-card.svelte` - Enhanced active track highlighting
   - Background highlight on active article: `var(--accent-2)`
   - Title pill with `var(--accent-9)` background
   - Slightly rounded corners for polish

**plan.md updated:**

- Removed completed items (track highlighting, URL param)

7. `src/lib/components/player.svelte` - Queue position display
   - Shows `X/Y` position in queue (e.g., "3/42")
   - Only visible when queue has more than 1 track
   - Uses `queuePosition()` from new queue module

8. `src/styles/player.css` - Queue position styling
   - Subtle gray, tabular-nums for alignment

**Tests added:**

9. `src/lib/player/queue.test.ts` - 17 tests for queue functions
   - Navigation, creation, insertion, removal, shuffle, slicing, manipulation

10. `src/lib/selectors/tracks.test.ts` - 17 tests for track selectors
    - Filtering, sorting, slicing, transforming, searching, date filtering

**Summary:**

- 57 total tests passing
- 0 lint errors
- New composable API: `pipe()`, `queue.*`, `tracks.*`
- Visual improvements: queue position display, active track highlighting

---

### Iteration 2: Queue Actions & Date Rethink

**New files:**

1. `src/lib/selectors/channels.ts` - Pure channel selectors
   - `bySource`, `byId`, `bySlug`, `sortByCreated`, `sortByUpdated`
   - `sortByName`, `sortByTrackCount`, `withMinTracks`, `broadcasting`
   - `withLocation`, `search`, `searchSlug`, `take`, `skip`
   - `toIds`, `toSlugs`, `count`, `createdAfter`, `updatedAfter`
   - `shuffle`, `groupByYear`

**Extended:**

2. `src/lib/api.js` - Queue actions
   - `playNext(trackIds)` - queue track(s) to play after current
   - `removeFromQueue(trackId)` - remove track from queue

3. `src/lib/dates.js` - Value-neutral date formats
   - `dateYear()` - just "2019"
   - `dateMonthYear()` - "Mar 2019"
   - `dateSeason()` - "Spring 2019"
   - `dateProvenance()` - smart: "this week", "this month", "recent", or year

4. `src/lib/components/track-card.svelte` - "Play Next" menu option
   - Added button in track card popover menu

5. `src/lib/index.ts` - Exports `playNext`, `removeFromQueue`

6. `i18n/messages/en.json` - Added `track_play_next` translation

**Summary:**

- Channel selectors mirror track selectors for consistency
- playNext uses queueInsertManyAfter from pure queue module
- Value-neutral dates: old channels are archives, not stale

---

### Iteration 3: History Selectors & Shuffle Play

**New files:**

1. `src/lib/memo.ts` - Memoization utility for pure functions
   - `memo(fn, maxSize)` - memoize single-argument function with LRU eviction
   - `memoBy(fn, keyFn, maxSize)` - memoize with custom key function
   - `clearAllCaches()` - for testing

2. `src/lib/selectors/history.ts` - Pure play history selectors
   - `bySlug`, `byTrackId`, `sortByStarted`
   - `completed`, `skipped`, `notSkipped`, `shufflePlays`
   - `byStartReason`, `byEndReason`
   - `today`, `thisWeek`, `thisMonth`
   - `take`, `skip`, `totalMsPlayed`, `count`
   - `uniqueTrackIds`, `uniqueSlugs`
   - `groupByTrack`, `groupByChannel`
   - `mostPlayed`, `mostListenedChannels`
   - `formatDuration`

**Extended:**

3. `src/lib/selectors/index.ts` - Added utility functions
   - `pickRandom(arr)` - pick random element
   - `pickRandomN(n)` - pick N random elements (no duplicates)
   - `tap(fn)` - execute side effect, return value (for debugging pipelines)
   - `when(predicate, transform)` - conditionally apply transform
   - Re-exports `history` namespace

4. `src/lib/api.js` - Shuffle play action
   - `shufflePlayChannel({id, slug})` - play channel from random track with shuffle enabled

**Summary:**

- History selectors enable listening pattern analysis (most played, time filtering)
- Memoization utility for caching expensive computations (regex parsing, etc.)
- Shuffle play combines random start + shuffle mode in one action
- Pipeline utilities: `tap` for debugging, `when` for conditional transforms
- Iteration stopped per user request

---

### Iteration 4: Console REPL & Queue Controls

**Philosophy:** The console becomes a music REPL. Lispy pipelines from the devtools.

**Extended window.r5:**

1. `src/routes/+layout.js` - Full selectors and api exposed
   - `window.r5.pipe()`, `window.r5.tracks.*`, `window.r5.channels.*`, `window.r5.queue.*`
   - `window.r5.api` - all player/queue operations
   - Console experimentation: `r5.pipe([...r5.tracksCollection.state.values()], r5.tracks.bySlug('starttv'))`

**New queue operations:**

2. `src/lib/api.js` - Four queue manipulation functions
   - `playFromHere(trackId)` - play from this track to end of playlist
   - `clearQueue()` - clear queue, keep current track playing
   - `shuffleRemaining()` - shuffle what's left, keep current at front
   - `rotateQueue()` - radio mode: move played tracks to end (infinite loop)

3. `src/lib/index.ts` - Full API surface
   - Added channels selectors export
   - Added all composable utilities: `pickRandom`, `pickRandomN`, `tap`, `when`, `identity`, `constant`
   - Exported new queue functions

**UI enhancements:**

4. `src/lib/components/queue-panel.svelte` - Queue controls in sidebar
   - Shuffle remaining button (⤮)
   - Rotate queue button (↻) - radio mode
   - Clear queue button (✕)
   - Only visible when queue has 2+ tracks

5. `src/lib/components/track-card.svelte` - "Play from here" menu option
   - Plays from selected track to end of playlist
   - Useful for "I want to start from this point"

**i18n:**

6. `i18n/messages/en.json` - New translations
   - `queue_shuffle_remaining`, `queue_rotate`, `track_play_from_here`

**Console examples:**

```js
// Get all tracks from a channel
r5.pipe([...r5.tracksCollection.state.values()], r5.tracks.bySlug('starttv'), r5.tracks.sortByCreated('desc'))

// Shuffle remaining tracks
r5.api.shuffleRemaining()

// Radio mode - never run out
r5.api.rotateQueue()

// Play from a specific track
r5.api.playFromHere('track-uuid')
```

**Summary:**

- Console becomes a music REPL via `window.r5`
- Four new queue operations for different listening styles
- Queue panel has shuffle/rotate/clear controls
- "Play from here" in track menu

---

### Iteration 5: Composable Primitives & Radio Mode

**Philosophy:** Build small blocks that compose. Lispy elegance.

**Track selectors extended** (`src/lib/selectors/tracks.ts`):

New composable operations:

- `reverse` - reverse array order
- `shuffle` - Fisher-Yates shuffle
- `chunk(n)` - split into groups of N
- `partition(predicate)` - split by predicate → `[matches, nonMatches]`
- `unique(keyFn)` - dedupe by key function
- `interleave(...arrays)` - deal cards style mixing
- `concat(...arrays)` - combine arrays
- `flatten` - flatten nested arrays
- `window(n)` - sliding window
- `first`, `last`, `nth(n)` - element access
- `map(fn)`, `filter(predicate)`, `reduce(fn, initial)` - standard FP
- `sortBy(compareFn)`, `groupBy(keyFn)` - custom sort/group

**Radio mode** (`src/lib/types.ts`, `src/lib/app-state.svelte.ts`, `src/lib/api.js`, `src/lib/api/player.js`):

- New `radio_mode` state flag (persisted)
- `toggleRadioMode()` function
- When enabled: at end of queue, auto-rotates and plays from beginning
- Infinite listening - never run out of tracks
- Toggle button in player (↻ icon)

**UI** (`src/lib/components/player.svelte`):

- Radio mode button next to shuffle
- Active state when enabled

**Keyboard shortcuts** (`src/lib/keyboard.js`):

- `Shift+S` - shuffle remaining
- `Shift+R` - toggle radio mode

**i18n** (`i18n/messages/en.json`):

- `player_tooltip_radio_mode` - "Radio mode (loop forever)"

**Console examples:**

```js
// Interleave tracks from different channels (if both loaded)
const a = r5.pipe([...r5.tracksCollection.state.values()], r5.tracks.bySlug('ch1'))
const b = r5.pipe([...r5.tracksCollection.state.values()], r5.tracks.bySlug('ch2'))
r5.tracks.interleave(a, b)

// Partition: separate tracks with/without errors
const [good, bad] = r5.pipe(
	tracks,
	r5.tracks.partition((t) => !t.playback_error)
)

// Dedupe by YouTube video ID
r5.pipe(
	tracks,
	r5.tracks.unique((t) => extractYouTubeId(t.url))
)

// Enable radio mode from console
r5.api.toggleRadioMode()
```

**Summary:**

- 15 new composable selectors for array manipulation
- Radio mode for infinite listening (auto-loop at end)
- Keyboard shortcuts for quick queue operations
- Building blocks that pipe together naturally

---

### Iteration 6: Queue Expansion & Mix Builder

**Philosophy:** Focus on playback operations, not data filtering. TanStack handles queries.

**New queue operations** (`src/lib/player/queue.ts`):

- `queueSwap(queue, posA, posB)` - swap two items by position
- `queueReverse(queue)` - reverse play order
- `queueRepeat(queue, times)` - repeat queue N times
- `queueInterleave(a, b)` - interleave two queues (A1, B1, A2, B2, ...)
- `queueConcat(...queues)` - concatenate multiple queues
- `queueSplit(queue, position)` - split queue at position
- `queueRemaining(queue, currentId)` - items after current
- `queuePlayed(queue, currentId)` - items before current (played)
- `queueRandom(queue)` - pick random item

**Mix builder** (`src/lib/player/mix.ts`):

Fluent API for building playlists:

```js
mix()
	.from('starttv') // add tracks from channel
	.from('otherChannel') // add more
	.shuffle() // shuffle result
	.take(50) // limit
	.play() // start playback

// Or interleave channels
mixFrom('ch1').interleave(mixFrom('ch2')).play()

// Or from specific tracks
mixIds('track1', 'track2', 'track3').repeat(3).shuffle().queue()
```

Methods: `from`, `add`, `shuffle`, `reverse`, `unique`, `take`, `skip`, `repeat`, `interleave`, `concat`, `sortNewest`, `sortOldest`, `play`, `queue`, `queueNext`, `ids`, `tracks`

**Docs** (`docs/api-overview.md`):

- Documented the full API surface: selectors, collections, actions, SDK
- Mental model: what (selectors), where (collections), when (actions)

**Tests:**

- 26 queue tests (up from 17)
- All passing

**Summary:**

- 9 new queue operations for real music use cases
- Fluent mix builder for declarative playlist construction
- API universe documented

---

### Iteration 7: Mix Filters & Pruning

**Philosophy:** Keep what's useful, throw out the rest.

**Mix builder filters** (`src/lib/player/mix.ts`):

New filter methods:

- `.where(predicate)` - custom filter
- `.withoutErrors()` - exclude broken tracks
- `.youtube()` - only YouTube tracks
- `.soundcloud()` - only SoundCloud tracks
- `.recent(days)` - tracks from last N days
- `.withTag(tag)` - tracks with hashtag (in tags array or description)
- `.withMention(mention)` - tracks mentioning @user
- `.count()` - get track count

```js
// Play recent jazz tracks without errors
mixFrom('jazzChannel').withTag('jazz').recent(30).withoutErrors().shuffle().play()

// Find tracks mentioning an artist
mixFrom('starttv').withMention('kraftwerk').sortNewest().play()
```

**Pruned:**

- Removed ~120 lines from `tracks.ts`:
  - Set operations (union, intersection, difference, symmetricDifference)
  - Temporal selectors (today, lastHours, lastDays, fromYear, dateRange)
  - Statistical selectors (sample, stride, zip, pairs)
- Removed `docs/api-overview.md` (outdated)

**Rationale:** The mix builder IS the fluent interface. The track selectors were scaffolding - TanStack handles collection queries, mix builder handles playlist construction. No need for both.

**What remains:**

- `queue.ts` - 24 pure queue operations (179 lines)
- `mix.ts` - fluent playlist builder (238 lines)
- `tracks.ts` - core selectors for pipe() usage (300 lines, down from 418)
- `channels.ts` - channel selectors (151 lines)
- `history.ts` - play history analysis (152 lines)
- `selectors/index.ts` - pipe, compose, utilities (110 lines)

**Tests:** 66 passing

**Summary:**

- Mix builder now has practical filters (tags, mentions, recent, errors, platforms)
- Removed 120 lines of over-engineered code
- Cleaner, more focused API

---

### Iteration 8: Mix Sources & Clone

**New mix starters:**

- `mixCurrent()` - start from current queue
- `mixAll()` - start from all loaded tracks
- `mixRemaining()` - start from remaining queue (after current track)

**New method:**

- `.clone()` - fork a mix to build variations

```js
// Shuffle remaining tracks in queue
mixRemaining().shuffle().queue()

// Filter all loaded tracks by tag
mixAll().withTag('ambient').shuffle().play()

// Clone and vary
const base = mixFrom('starttv').withoutErrors()
base.clone().take(10).play() // first 10
base.clone().skip(10).take(10).play() // next 10

// Combine everything loaded, dedupe, shuffle
mixAll().unique().shuffle().take(100).play()
```

**Bug fix:** "Play all" on /search page now works

Search results weren't being written to `tracksCollection`, so `playTrack()` couldn't find them. Fixed by writing tracks to collection before playing.

**Tests:** 66 passing

---

### Iteration 9: Conditional Operations & Search

**Conditional mix operations:**

- `.when(condition, action)` - apply action if condition is true
- `.unless(condition, action)` - apply action if condition is false
- `.tap(fn)` - execute side effect, return mix unchanged
- `.log(label?)` - log current state for debugging

```js
const shuffleEnabled = true

mixFrom('starttv')
	.when(shuffleEnabled, (m) => m.shuffle())
	.unless(tracks.length > 100, (m) => m.take(100))
	.tap((tracks) => console.log('Selected', tracks.length))
	.play()
```

**Search integration:**

- `mixSearch(query, options?)` - async, builds mix from search results
- Supports web search syntax: `"jazz house"` (AND), `"jazz or house"` (OR), `"jazz -disco"` (exclude), `"exact phrase"` (quoted)

```js
// Search and play
const jazz = await r5.mixSearch('jazz')
jazz.shuffle().take(20).play()

// Complex queries
const electro = await r5.mixSearch('electronic -ambient')
const fusion = await r5.mixSearch('"jazz fusion" or "prog rock"')

// Scoped to channel
const channelJazz = await r5.mixSearch('jazz', {channelSlug: 'starttv'})
channelJazz.play()
```

**Tests:** 66 passing

---

### Iteration 10: Cleanup & Consolidation

**Philosophy:** Prune the unused. The mix builder IS the selector system.

**Deleted files:**

- `src/lib/selectors/tracks.ts` (300 lines) - redundant with mix builder
- `src/lib/selectors/tracks.test.ts` - tests for deleted code
- `src/lib/selectors/channels.ts` (151 lines) - unused in app
- `src/lib/selectors/history.ts` (152 lines) - unused in app
- `src/lib/memo.ts` (42 lines) - never imported

**Total removed:** ~645 lines

**Simplified:**

- `src/lib/selectors/index.ts` - kept only: `pipe`, `compose`, `identity`, `constant`, `pickRandom`, `pickRandomN`, `tap`, `when`, and re-export of `queue`
- Removed `selector()` function (duplicate of `compose`)
- Removed tracks/channels/history namespace exports

**Updated:**

- `src/lib/index.ts` - removed dead exports
- `src/routes/+layout.js` - window.r5 now exposes `queue` directly instead of full selectors

**What remains:**

- `queue.ts` (179 lines) - pure queue operations, well-tested
- `mix.ts` (313 lines) - fluent playlist builder, the real interface
- `selectors/index.ts` (68 lines) - FP utilities: pipe, compose, etc.

**Console API:**

```js
// The mix builder is the fluent interface
r5.mix().from('starttv').shuffle().take(20).play()
r5.mixFrom('channel').withTag('jazz').sortNewest().play()
r5.mixSearch('electronic').then((m) => m.shuffle().play())

// Pure queue operations available
r5.queue.queueShuffle(['a', 'b', 'c'])
r5.queue.queueInterleave(['a', 'b'], ['1', '2'])

// Direct collection access
[...r5.tracksCollection.state.values()].filter((t) => t.slug === 'ch')
```

**Rationale:**

The selector modules (tracks.ts, channels.ts, history.ts) were only used in two places:

1. Re-exports in index.ts
2. window.r5 console experimentation

They weren't used in actual app code. The mix builder provides the practical API:

- Mix handles playlist building fluently
- Standard array methods handle simple filtering
- TanStack DB handles reactive queries

No need for three abstraction layers.

**Tests:** 49 passing
