Batch Edit: Spreadsheet Power Mode

Goal: Transform batch-edit into a fast, keyboard-driven track surgery tool for channels with 2-3000 tracks.

Key Insight

Tags and mentions are derived from descriptions. Tag editing = description editing with smart #tag and @mention extraction/injection.

---

Phase 1: Performance (Virtualization) — IMPLEMENTED (blocked)

Problem: Current implementation renders all rows. 3000 tracks = 3000 DOM nodes = pain.

Solution: Virtual scrolling - render only ~50 visible rows.

Implementation:

1.  ✅ Add @tanstack/svelte-virtual (already using TanStack ecosystem)
2.  ✅ Wrap table body in virtualizer
3.  ✅ Maintain sticky header outside virtual container
4.  ✅ Preserve row height consistency for accurate scroll math

Files:

- +page.svelte - integrate virtualizer around track list
- May need container restructure for sticky header + virtual body

**Status**: Attempted with `@tanstack/svelte-virtual` - Svelte 5 compatibility issues. Scroll events don't trigger re-renders properly. User switched to `@humanspeak/svelte-virtual-list` (see current +page.svelte). Needs fresh approach.

**Learnings**:
- `@tanstack/svelte-virtual` API expects Svelte 4 reactive statements (`$:`)
- Svelte 5 runes + TanStack Virtual store subscriptions conflict
- Creating virtualizer in `$effect` breaks scroll tracking (recreates on deps change)
- Using getters for reactive options partially works but scroll doesn't update items

---

Phase 2: Keyboard Navigation & Selection

Goal: Excel-like cell navigation without mouse dependency.

Features:

- Arrow keys: move between cells
- Tab/Shift+Tab: move across columns
- Enter: edit current cell
- Escape: cancel edit, deselect
- Shift+Arrow: extend selection
- Ctrl+A: select all visible/filtered

Implementation:

1.  Track focusedCell: {rowIndex, colIndex} state
2.  Keydown handler on table container
3.  Scroll-into-view when navigating beyond viewport
4.  Visual focus indicator (border/highlight)

Files:

- +page.svelte - keyboard handler, focus state
- TrackRow.svelte - accept focused cell prop, render focus state
- InlineEditCell.svelte - respond to external edit trigger

---

Phase 3: Instant Search

Goal: Type and instantly filter to matching tracks.

Features:

- Search box at top
- Fuzzy match across: title, description, url
- Combine with existing filters (search + "has-error")
- Debounced input (50-100ms)

Implementation:

1.  Add search input state
2.  Extend filteredTracks derived to include search term
3.  Simple includes() matching (or lightweight fuzzy lib if needed)

Files:

- +page.svelte - search input, derived filter extension

---

Phase 4: Batch Operations

Goal: Act on selection (finally wire up those checkboxes).

4a: Batch Description Editing (Tag Management)

Since tags derive from descriptions:

- Add tag: Append #tagname to selected tracks' descriptions
- Remove tag: Strip #tagname from descriptions
- Add mention: Append @artist to descriptions

UI: Action bar appears when selection active
[Selected: 47] [Add Tag...] [Remove Tag...] [Delete...]

4b: Bulk Delete

- Confirmation dialog with count
- Hard delete (simpler, deleting is rare anyway)

4c: Future - Find & Replace (v2)

Could add later: find text in descriptions, replace with something else. Useful for bulk typo fixes or tag renames. Skip for v1.

Files:

- +page.svelte - action bar component, batch handlers
- src/routes/tanstack/collections/tracks.ts - batch update/delete functions

---

Phase 5: Feedback & Polish

- Confirmation dialogs: Before batch ops, show "This will update 47 tracks. Continue?"
- Dirty indicators: Show pending sync status per row
- Operation toasts: "Updated 47 tracks" confirmation
- Column sorting: Click header to sort (already have ordering capability)

Note: True undo is complex with offline-mutators (transactions already committed to IndexedDB). V1 relies on confirmation dialogs instead. Undo could
be a future enhancement tracking reverse operations.

---

File Map

| File                       | Changes                                       |
| -------------------------- | --------------------------------------------- |
| +page.svelte               | Virtualizer, keyboard nav, search, action bar |
| TrackRow.svelte            | Focus state, dirty indicator                  |
| InlineEditCell.svelte      | External edit trigger                         |
| collections/tracks.ts      | Batch update/delete functions                 |
| New: BatchActionBar.svelte | Selection actions UI                          |

---

Dependencies

- @tanstack/svelte-virtual - virtual scrolling

---

Decisions Made

- Undo: Skip for v1 (offline-mutators complexity). Use confirmation dialogs instead.
- Find & replace: Skip for v1. Simple tag add/remove covers most cases.
- Delete: Hard delete with confirmation (deleting is rare).

---

Implementation Order

1.  Phase 1: Virtualization - Critical for 3000 tracks
2.  Phase 3: Search - Quick win, high value
3.  Phase 4: Batch ops - Wire up selection to actions
4.  Phase 2: Keyboard nav - Polish layer
5.  Phase 5: Feedback - Confirmations, toasts
