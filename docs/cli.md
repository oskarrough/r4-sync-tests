# CLI

Local-first data CLI for querying Radio4000 data.

When you use the `list` command, use `--source` to control where data comes from:

- `--source local` - your local database
- `--source r4` - remote radio4000 API
- `--source v1` - legacy radio4000 v1 API (read-only)

> Note: While `list` commands require an explicit `--source`, you can use `pull` to fetch from r4>v1.

## tldr

```bash
# Save as JSON representation of a channel
bun cli channels list ko002 --json > my-channel.json

# Get tracks from any channel
bun cli tracks list ko002 --limit 5

# Save as JSON and process with jq
bun cli tracks list ko002 --json | jq '.[].url'

# Get channel slugs (use --limit for large datasets)
bun cli channels list --limit 10 --json | jq -r '.[].slug'

# Search (everything, --tracks, --channels, or @mention)
bun cli search "acid" --tracks --json | jq '.[].title'
```

```bash
# Live data from radio4000
bun cli tracks list ko002 --source r4 --limit 10

# Compare local vs remote
bun cli channels list --source local --json > local.json
bun cli channels list --source r4 --json > remote.json
```

## Search

Search queries your local database only. Use `pull` to sync data locally first.

```bash
# Search everything, filter with flags, or use @mention syntax
bun cli search "ambient"
bun cli search "ko002" --channels
bun cli search "#jazz" --tracks
bun cli search "@detecteve acid"  # search within channel
```

## Piping magic

Extract URLs for external tools:

```bash
# Get track URLs (add --limit for large channels)
bun cli tracks list ko002 --source r4 --limit 20 --json | jq -r '.[].url'

# Save track titles to file
bun cli tracks list ko002 --json | jq -r '.[].title' > tracks.txt

# Chain with other unix tools
bun cli tracks list ko002 --json | jq -r '.[].url' | grep youtube | wc -l
```

Filter and transform:

```bash
# Only YouTube URLs
bun cli tracks list ko002 --json | jq '.[] | select(.url | contains("youtube"))'

# Extract just title and URL
bun cli tracks list ko002 --json | jq '.[] | {title, url}'

# Get channels with more than 100 characters in description
bun cli channels list --json | jq '.[] | select(.description | length > 100)'
```
