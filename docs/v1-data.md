# v1 data from Firebase

## Background

Background: in 2024 we launched v2 of Radio4000 with a Supabase database. You are unfortunately required to manually migrate your channel and tracks from firebase realtime db (v1) to v2.

R5 treats v1 data as read-only, but otherwise displays it in the app as any other data. Goal is to never mention any migration or v1.

# How to export v1 channels data

1. Open the Firebase console
2. Find the realtime database
3. Export all channels to `/static/radio4000-channels-export.json`
4. Serialize the data into our v2 schema using this `jq` command. It filters out channels with less than 5 tracks. This generates the data files like `static/channels-v1-modified.json`.

```bash
jq 'to_entries | .[0:99999] | map({firebase_id: .key, created_at: .value.created, updated_at: .value.updated, slug: .value.slug, name: .value.title, description: .value.body, image: .value.image, track_count: (.value.tracks | if . then length else 0 end), track_ids: (.value.tracks | if . then (to_entries | map(.key)) else [] end) }) | map(select(.track_count > 5)) ' static/radio4000-channels-export.json > static/channels-v1-modified.json
```

r5 reads this file automatically.

Note, the export includes track ids, but no track data. Track data is still fetched from the v1 API.
