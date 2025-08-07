-- Create followers table (local mirror of remote schema)
create table if not exists followers (
    follower_id text not null,
    channel_id uuid not null references channels (id) on delete cascade,
    created_at timestamp with time zone default CURRENT_TIMESTAMP,
    synced_at timestamp with time zone,
    PRIMARY KEY (follower_id, channel_id)
);

-- Index for querying followers by channel
create index if not exists idx_followers_channel_id on followers (channel_id);
-- Index for querying followings by follower
create index if not exists idx_followers_follower_id on followers (follower_id);