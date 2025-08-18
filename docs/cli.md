# CLI

Local-first music player CLI for querying and managing radio4000 data.

## tldr

```bash
# Get tracks from any channel
bun ./cli.ts tracks list ko002 --limit 5

# Save as JSON and process with jq
bun ./cli.ts tracks list ko002 --json | jq '.[].url'

# Get channel slugs (use --limit for large datasets)
bun ./cli.ts channels list --limit 10 --json | jq -r '.[].slug'

# Search (everything, --tracks, --channels, or @mention)
bun ./cli.ts search "acid" --tracks --json | jq '.[].title'
```

## Sources

Use `--source` to control where data comes from:

- `--source local` (default) - your local database
- `--source r4` - remote radio4000 API (read-only)
- `--source v1` - legacy radio4000 v1 API

Remote sources bypass local db and query live data:

```bash
# Live data from radio4000
bun ./cli.ts tracks list ko002 --source r4 --limit 10

# Compare local vs remote
bun ./cli.ts channels list --source local --json > local.json
bun ./cli.ts channels list --source r4 --json > remote.json
```

## Search

```bash
# Search everything, filter with flags, or use @mention syntax
bun ./cli.ts search "ambient"
bun ./cli.ts search "ko002" --channels
bun ./cli.ts search "#jazz" --tracks
bun ./cli.ts search "@detecteve acid"  # search within channel
```

## Piping magic

Extract URLs for external tools:

```bash
# Get track URLs (add --limit for large channels)
bun ./cli.ts tracks list ko002 --source r4 --limit 20 --json | jq -r '.[].url'

# Save track titles to file
bun ./cli.ts tracks list ko002 --json | jq -r '.[].title' > tracks.txt

# Chain with other unix tools
bun ./cli.ts tracks list ko002 --json | jq -r '.[].url' | grep youtube | wc -l
```

Filter and transform:

```bash
# Only YouTube URLs
bun ./cli.ts tracks list ko002 --json | jq '.[] | select(.url | contains("youtube"))'

# Extract just title and URL
bun ./cli.ts tracks list ko002 --json | jq '.[] | {title, url}'

# Get channels with more than 100 characters in description
bun ./cli.ts channels list --json | jq '.[] | select(.description | length > 100)'
```
