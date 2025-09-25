export default `-- Add channels filter state persistence
ALTER TABLE app_state
ADD COLUMN IF NOT EXISTS channels_filter TEXT DEFAULT '20+',
ADD COLUMN IF NOT EXISTS channels_shuffled BOOLEAN DEFAULT true;
`