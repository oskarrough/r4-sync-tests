export default `CREATE TABLE IF NOT EXISTS play_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    ms_played INTEGER DEFAULT 0,
    reason_start TEXT, -- 'user_click', 'user_next', 'user_previous', 'auto_next', 'shuffle_next', 'broadcast_sync', 'playlist_load'
    reason_end TEXT,   -- 'track_completed', 'user_next', 'user_previous', 'user_stop', 'playlist_change', 'youtube_error', 'broadcast_sync'
    shuffle BOOLEAN DEFAULT false,
    skipped BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_play_history_track_id ON play_history(track_id);
CREATE INDEX IF NOT EXISTS idx_play_history_started_at ON play_history(started_at DESC);

CREATE TABLE IF NOT EXISTS track_meta (
  ytid TEXT PRIMARY KEY,
  duration INTEGER,
  -- Provider-specific JSON data
  youtube_data JSONB,
  musicbrainz_data JSONB,
  -- Metadata timestamps
  youtube_updated_at TIMESTAMP,
  musicbrainz_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for JSON queries
CREATE INDEX IF NOT EXISTS idx_track_meta_youtube_data ON track_meta USING GIN (youtube_data);
CREATE INDEX IF NOT EXISTS idx_track_meta_musicbrainz_data ON track_meta USING GIN (musicbrainz_data);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_track_meta_ytid ON track_meta (ytid);

CREATE TABLE IF NOT EXISTS followers (
    follower_id TEXT NOT NULL,
    channel_id UUID NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (follower_id, channel_id)
);

-- Index for querying followers by channel
CREATE INDEX IF NOT EXISTS idx_followers_channel_id ON followers (channel_id);
-- Index for querying followings by follower
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers (follower_id);

-- Track edits staging table for batch editing
CREATE TABLE IF NOT EXISTS track_edits (
  track_id UUID REFERENCES tracks(id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (track_id, field)
);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_track_edits_status ON track_edits (status);
`
