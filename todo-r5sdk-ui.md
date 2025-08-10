# r5 sdk explorer ui

fullscreen matrix-style hacker interface for exploring the r5 experimental api.
dieter rams aesthetic meets nad hifi textures. monospace crt vibes.

## vision

desktop-like control panel with:

- command input/output terminal
- live sync streaming visualizer (watch data flow into local db)
- status lamps that bleep on sync operations
- batch progress indicators (hook into `src/lib/batcher.js`)
- source indicators (local/r4/v1 with different colors)

## route

`/sdk` - dedicated svelte route for testing

## design system

### aesthetic

- monospace typography throughout
- nad hifi inspired controls (chunky buttons, led indicators)
- dieter rams minimalism (function over decoration)
- use css variables from `src/styles/variables.css`
- no crt effects (clean, readable)

### color coding

- local operations: `--color-green` (instant, cached)
- r4 network: `--color-lavender` (remote fetch)
- v1 firebase: `--color-orange` (legacy)
- errors: `--color-red`
- processing: `--color-yellow` (pulsing)

## components breakdown

### 1. experimental CLI

```
┌─ r5 terminal ────────────────┐
│ $ r5 channels                │
│ ✓ 142 channels (12ms)        │
│ $ r5 tracks pull oskar       │
│ ⟳ pulling... [████░░░░] 67%  │
└──────────────────────────────┘
```

**CLI translator**: converts github-cli style commands to `experimental-api` calls:

- `r5 channels` → `r5.channels()`
- `r5 channels local` → `r5.channels.local()`
- `r5 channels r4` → `r5.channels.r4()`
- `r5 channels pull` → `r5.channels.pull()`
- `r5 tracks oskar` → `r5.tracks({channel: 'oskar'})`
- `r5 tracks pull oskar` → `r5.tracks.pull({slug: 'oskar'})`
- `r5 search jazz` → `r5.search('jazz')`
- `r5 queue add 123` → `r5.queue.add(trackId)`
- `r5 db reset` → `r5.db.reset()`

features:

- command history (up/down arrows)
- autocomplete for subcommands
- result visualization (json/table toggle)
- timing information
- copy result to clipboard

### 2. source status panel

```
┌─ sources ────────────────────┐
│ LOCAL  [●] 142 ch, 5.2k tr   │
│ R4     [○] ready      [SYNC] │
│ V1     [●] 89 ch      [SYNC] │
└──────────────────────────────┘
```

features:

- live connection status
- data counts
- last sync timestamps
- sync buttons to trigger live streaming

### 3. batch visualizer

```
┌─ batch progress ─────────────┐
│ pulling tracks...            │
│ batch 3/10 [████████░░] 80%  │
│ ▪▪▪●●●●●○○ (7/10 batches)   │
│ items: 350/500               │
│ errors: 2                    │
└──────────────────────────────┘
```

hooks into `batcher.js` console logs:

- intercept batcher progress
- visual batch indicators
- error tracking
- eta calculation

### 4. data explorer

```
┌─ explorer ───────────────────┐
│ channels │ tracks │ search   │
├──────────────────────────────┤
│ filter: [___________] 🔍     │
│                              │
│ ▶ oskar (142 tracks)        │
│ ▶ jazz-network (89 tracks)  │
│ ▶ experimental (203 tracks) │
└──────────────────────────────┘
```

features:

- tabbed navigation
- live filtering
- expandable items
- quick actions (pull, delete, play)

### 5. activity monitor

```
┌─ activity ───────────────────┐
│ 12:34:56 r5.channels() 12ms  │
│ 12:34:55 r5.pull() 2.3s     │
│ 12:34:50 search('jazz') 8ms │
└──────────────────────────────┘
```

features:

- live operation log
- timing information
- source indicators
- error highlighting

## implementation tasks

### phase 1: foundation ✓ COMPLETED

1. ✓ create `/sdk` route with basic layout
2. ✓ implement experimental CLI translator (gh-style commands → r5 API calls)
3. ✓ implement command terminal with input/output
4. ✓ wire up command parsing and r5 api execution
5. ✓ add result formatting (basic success/error display with timing)

### phase 2: visualizers

6. create source status panel with live indicators
7. implement batch progress visualizer
8. hook into batcher.js console output
9. add activity monitor with operation log

### phase 3: explorer

10. build data explorer with tabs
11. implement live filtering
12. add expandable detail views
13. create quick action buttons

### phase 4: polish

14. implement streaming sync visualizer (data flowing into local)
15. add keyboard shortcuts
16. implement command history/autocomplete
17. add copy functionality

### phase 5: advanced

18. implement visual diff between sources
19. add performance profiling view
20. create operation replay/undo

## technical notes

### state management

- use svelte 5 runes for reactivity
- create inline table `sdk_component_state` for ui state
- store command history, sync status, activity log
- track active operations for activity monitor

### intercepting batcher

```js
// override console.log to capture batcher progress
const originalLog = console.log
console.log = (...args) => {
	if (args[0]?.startsWith('batcher:')) {
		updateBatchProgress(args[0])
	}
	originalLog(...args)
}
```

### keyboard shortcuts

- `tab` - autocomplete
- `esc` - cancel operation

### streaming sync visualizer

- intercept sync operations to show live progress
- animate channels/tracks flowing into local db (gsap for smooth transitions)
- real-time counters during pull operations (gsap countUp animations)
- visual indicators for each batch completion
- gsap timeline for orchestrating data flow animations

### gsap animations

- `gsap.fromTo()` for data items flowing in
- `gsap.to()` for progress bars filling
- `gsap.timeline()` for complex sync orchestration
- `gsap.set()` for instant state changes
- countUp plugin for number animations

## references

- see `docs/experimental-api.md` for api patterns
- see `src/lib/experimental-api` for implementation
- use `src/lib/batcher.js` for progress tracking
- rely on `src/styles/variables.css` for colors

## clarifications

- streaming sync: click sync button → watch channels/tracks flow into local db
- export/import: deferred (sdk will have this soon)
- sound effects: off by default
- crt effects: not needed
- state: inline table `sdk_component_state_*` (no migrations)

## questions for guidance

1. should we persist terminal history across sessions?
2. any specific animations for the streaming sync visualizer?
