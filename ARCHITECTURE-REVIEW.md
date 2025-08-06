# r5 architecture review

an assessment of architectural patterns and improvement opportunities in the r5 codebase.

## executive summary

the codebase demonstrates strong local-first principles with dual database architecture and reactive data flows. main opportunities for improvement center around error handling consistency, sync operation complexity, and clearer separation between data operations and ui concerns.

## areas for architectural improvement

### 1. error handling patterns
**where**: throughout sync operations (`/src/lib/sync.js`, `/src/lib/sync/followers.js`, broadcast.js)
**why**: inconsistent error handling creates debugging challenges and potential silent failures
- sync operations often swallow errors with only console logging
- no user-facing error recovery mechanisms
- mixed patterns: some functions throw, others log and continue
- transaction rollback behavior unclear on partial failures

### 2. sync operation complexity
**where**: `sync.js`, `api.js` interaction patterns
**why**: multiple sync strategies without clear boundaries create maintenance burden
- `needsUpdate()` logic relies on timestamp comparisons with hardcoded tolerance
- v1 vs v2 channel handling creates branching complexity
- follower sync has complex local-user migration logic
- no clear sync queue or retry mechanism for failed operations

### 3. state persistence patterns
**where**: `app-state.svelte.ts:persistAppState()`
**why**: manual sql string construction is error-prone and hard to maintain
- building array literals as sql strings instead of parameterized queries
- 100+ line function for single state update
- no validation of state shape before persistence
- mixing ui state with data state in single table

### 4. live query patterns
**where**: route components using `liveQuery` and `incrementalLiveQuery`
**why**: inconsistent usage patterns across components
- some routes use live queries, others use one-time queries
- cleanup logic scattered across effects
- no clear guidance on when to use incremental vs regular live queries
- performance implications of live queries on large datasets unclear

### 5. api function composition
**where**: `/src/lib/api.js`
**why**: mixing concerns reduces composability
- ui manipulation functions (`toggleTheme`, `openSearch`) mixed with data operations
- direct dom manipulation in data layer (`togglePlayPause`)
- no clear separation between local operations and those requiring sync
- functions with side effects not clearly marked

### 6. data flow inconsistencies
**where**: interaction between api.js, sync.js, and components
**why**: multiple patterns for similar operations create confusion
- `ensureFollowers()` pattern not consistently applied to other entities
- some operations auto-pull data, others require explicit calls
- unclear when operations hit local vs remote database

### 7. transaction boundaries
**where**: sync operations, particularly `pullTracks()` and `pullChannels()`
**why**: chunked processing without clear transaction semantics
- partial sync failures leave database in inconsistent state
- no mechanism to resume interrupted syncs
- busy flag on channels but no global sync state tracking

### 8. broadcast architecture
**where**: `/src/lib/broadcast.js`
**why**: stateful module with global side effects
- module-level state (`lastBroadcastingChannelId`, `lastTrackId`)
- reactive sync setup creates implicit dependencies
- no cleanup if broadcast sync fails partway

### 9. type safety gaps
**where**: throughout, particularly in sync and api modules
**why**: jsdoc types not consistently applied or validated
- many functions missing type annotations
- no runtime validation of data shapes from remote sources
- `@ts-expect-error` comments indicate type system limitations

### 10. component data fetching
**where**: route components like `[slug]/+page.svelte`
**why**: data fetching logic embedded in components
- search logic mixed with ui concerns
- debouncing implemented per-component instead of reusable utility
- no clear loading/error states for async operations

## positive patterns to preserve

- local-first approach with offline capability
- reactive ui updates via live queries
- clear sync terminology (pull/push/sync)
- transaction usage for atomic updates
- chunked processing for large datasets
- semantic html focus

## recommendations for next steps

1. **standardize error handling**: create consistent error types and recovery strategies
2. **extract sync orchestration**: separate sync scheduling from data operations
3. **introduce operation queue**: implement retry logic and sync state tracking
4. **simplify state persistence**: use parameterized queries or orm-like abstraction
5. **clarify live query guidelines**: document when to use each pattern
6. **separate api layers**: split ui operations from data operations
7. **implement sync resumption**: track sync progress and allow continuation
8. **add data validation layer**: validate remote data shapes before persistence
9. **create loading/error boundaries**: standardize async operation handling in ui
10. **document data flow patterns**: clear guidelines for local vs remote operations

## complexity reduction opportunities

- consolidate follower sync logic into single flow
- remove v1 channel special cases if possible
- unify track and channel pull patterns
- extract dom manipulation from data layer
- standardize component data fetching patterns

this architecture serves the local-first vision well but would benefit from clearer boundaries between layers and more consistent patterns for common operations.
