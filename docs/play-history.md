# Play history feature

For fun and profits, we track "plays" throughout the app and store them in the `play_history` table.

Each record has `reason_start` and `reason_end` fields (and more). See types.ts for all the reasons we can use.

## Relevant functions

- `playTrack(id, endReason, startReason)`
- `addPlayHistory({previousTrackId, nextTrackId, endReason, startReason})`

## Notes

- The `next()` function transforms certain endReasons to more descriptive start reasons.
- YouTube errors are stored with specific error codes as `youtube_error_${code}` (e.g., `youtube_error_2`, `youtube_error_5`)
