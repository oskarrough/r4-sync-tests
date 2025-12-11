# Play history

Every track played leaves a trace—a small record of the moment you pressed play, how long you lingered, and why you moved on.

## Data structure

```ts
interface PlayHistoryEntry {
	id: string
	track_id: string
	slug: string
	title: string
	url: string
	started_at: string
	ended_at?: string
	ms_played: number
	reason_start?: string
	reason_end?: string
	shuffle: boolean
	skipped: boolean
}
```

The `reason_start` captures intent: did you click deliberately, or did the queue carry you here? The `reason_end` records departure: skipped after three seconds, played to completion, or interrupted by a YouTube error code (`youtube_error_2`, `youtube_error_5`, and their ilk).

## Functions

```js
addPlayHistoryEntry(track, {reason_start, shuffle})
endPlayHistoryEntry(trackId, {ms_played, reason_end, skipped})
clearPlayHistory()
```

A play begins when `addPlayHistoryEntry` fires. It remains open—no `ended_at`—until something concludes it. The `endPlayHistoryEntry` function finds the most recent open entry for that track (handling the peculiar case of repeat plays) and seals it with duration and cause of death.

## Storage

Local only. The collection persists to localStorage under `r5-play-history`. No sync to remote—your listening habits remain your own.

## Why track this

Statistics, eventually. Patterns of listening. The tracks you always skip past. The ones you play repeatedly at 2am. Data that might, someday, tell you something about yourself you didn't already know.
