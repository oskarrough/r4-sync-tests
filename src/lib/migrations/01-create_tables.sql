CREATE TABLE IF NOT EXISTS channels (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	name TEXT NOT NULL,
	slug TEXT UNIQUE NOT NULL,
	description TEXT,
	image TEXT,
	busy BOOLEAN,
	firebase_id TEXT unique,
	tracks_synced_at TIMESTAMP WITH TIME ZONE,
	broadcasting BOOLEAN,
	spam BOOLEAN,
	track_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);

CREATE TABLE IF NOT EXISTS tracks (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
	url TEXT NOT NULL,
	title TEXT NOT NULL,
	description TEXT,
	discogs_url TEXT,
	firebase_id TEXT unique
);

CREATE INDEX IF NOT EXISTS idx_tracks_channel_id ON tracks(channel_id);

CREATE TABLE IF NOT EXISTS app_state (
	id INTEGER PRIMARY KEY,
	theme TEXT,
	counter INTEGER DEFAULT 0,
	channels_display TEXT,

	is_playing BOOLEAN DEFAULT false,
	volume NUMERIC DEFAULT 0.5,
	muted BOOLEAN DEFAULT false,
	shuffle BOOLEAN DEFAULT false,
	show_video_player BOOLEAN default false,
	player_expanded BOOLEAN default false,

	playlist_tracks UUID[] DEFAULT ARRAY[]::UUID[],
	playlist_track UUID references tracks(id),

	channels UUID[] DEFAULT ARRAY[]::UUID[],
	custom_css_variables JSONB DEFAULT '{}'::jsonb
);

INSERT INTO app_state (id) values (1) on conflict do nothing;
