# Track Metadata System

Metadata from YouTube, MusicBrainz, and Discogs stored in `track_meta` table: `{ytid, youtube_data, musicbrainz_data, discogs_data}`.

## Sources & API

- **YouTube**: `@lib/metadata/youtube.js` - duration, title, description
- **MusicBrainz**: `@lib/metadata/musicbrainz.js` - artist, release info  
- **Discogs**: `@lib/metadata/discogs.js` - detailed release metadata

### Method patterns:
- `pull(params)` - fetch from external API and save to local db
- `local(ytids)` - read from local track_meta only
- `search(title)` - search external API without saving
- `fetch(url)` - fetch external data without saving
- `hunt(trackId, ytid, title)` - discover Discogs URL via MusicBrainz chain

## Auto-Discovery

Tracks without `discogs_url` automatically attempt discovery via:
`title → MusicBrainz recording → releases → Discogs URLs`

Uses `discogs.hunt()` which searches MusicBrainz, finds releases, extracts Discogs URLs from relationships, and saves discovered URL to tracks table.

## Usage

`tracks_with_meta` view joins tracks + track_meta for easy querying.

All metadata stored locally. Future: shared metadata via @radio4000/sdk.
