# Track Metadata System

Metadata from YouTube, MusicBrainz, and Discogs stored in `track_meta` table: `{ytid, youtube_data, musicbrainz_data, discogs_data}`.

## Sources & Sync
- **YouTube**: `@lib/sync/youtube.js` - duration, title, description
- **MusicBrainz**: `@lib/sync/musicbrainz.js` - artist, release info  
- **Discogs**: `@lib/sync/discogs.js` - detailed release metadata

## Auto-Discovery
Tracks without `discogs_url` automatically attempt discovery via:
`title → MusicBrainz recording → releases → Discogs URLs`

See `@lib/sync/auto-discogs.js` and integration in `track-meta.svelte`.

## Usage
`tracks_with_meta` view joins tracks + track_meta for easy querying.

All metadata stored locally. Future: shared metadata via @radio4000/sdk.
