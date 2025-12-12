Batch Edit: Spreadsheet Power Mode

Goal: Transform batch-edit into a fast, keyboard-driven track surgery tool for channels with 2-3000 tracks.

Key Insight

Tags and mentions are derived from descriptions. Tag editing = description editing with smart #tag and @mention extraction/injection.

---

Phase 1: Performance (Virtualization) — ✅ DONE

Using `@humanspeak/svelte-virtual-list` - works with Svelte 5.

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

Phase 3: Instant Search — ✅ DONE

- Search box with fuzzysort on title/description/url
- Tags dropdown (from track.tags, sorted by frequency)
- Mentions dropdown (from track.mentions, sorted by frequency)
- All filters combine with existing dropdown filter

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
- src/lib/tanstack/collections/tracks.ts - batch update/delete functions

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

- @humanspeak/svelte-virtual-list - virtual scrolling
- fuzzysort - search filtering

---

Decisions Made

- Undo: Skip for v1 (offline-mutators complexity). Use confirmation dialogs instead.
- Find & replace: Skip for v1. Simple tag add/remove covers most cases.
- Delete: Hard delete with confirmation (deleting is rare).

---

Implementation Order

1.  ✅ Phase 1: Virtualization - Critical for 3000 tracks
2.  ✅ Phase 3: Search - Quick win, high value
3.  Phase 4: Batch ops - Wire up selection to actions
4.  Phase 2: Keyboard nav - Polish layer
5.  Phase 5: Feedback - Confirmations, toasts

Also done:

- Double-click to edit cells (avoids conflict with row selection)
- Inline editing with Enter to save, Escape to cancel
