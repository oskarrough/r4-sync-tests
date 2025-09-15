export default `-- Add download tracking fields to tracks table
ALTER TABLE tracks
ADD COLUMN download_status TEXT DEFAULT 'pending',
ADD COLUMN download_error TEXT,
ADD COLUMN download_attempted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN download_path TEXT;

-- Create index for querying download status
CREATE INDEX IF NOT EXISTS idx_tracks_download_status ON tracks(download_status);
CREATE INDEX IF NOT EXISTS idx_tracks_download_attempted_at ON tracks(download_attempted_at);
`