-- Add status field to track_edits for undo capability
ALTER TABLE track_edits ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_track_edits_status ON track_edits (status);