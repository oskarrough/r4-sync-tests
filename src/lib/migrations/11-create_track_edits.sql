-- Create table for staging track edits
CREATE TABLE track_edits (
  track_id UUID REFERENCES tracks(id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (track_id, field)
);