# Player

Uses [media-chrome](https://www.media-chrome.org/) with custom YouTube and SoundCloud player elements.

## Architecture

- `youtube-video-custom-element.js` - YouTube IFrame API wrapper
- `soundcloud-player-custom-element.js` - SoundCloud Widget API wrapper
- Both implement HTMLMediaElement-compatible interface for media-chrome

## Key patterns

- Only render one player at a time using `{#if trackType}`
- Both players have `slot="media"` when active
- YouTube URLs converted to embed format (`/embed/VIDEO_ID`) in `#initializePlayer()`
- Use `loadVideoById()` for track changes, avoiding player re-initialization

## State

`app_state` table stores all application state including player state.
`play_history` table tracks played tracks with start/end reasons.
