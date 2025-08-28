# followers

follow/save channels as favorites. stored in `followers` table with `follower_id` and `channel_id`.

## behavior

**unauthenticated**: saves to local db with `follower_id = 'local-user'`

**authenticated**: 
- saves to local db with user's channel id
- syncs bidirectionally with r4 (except v1 channels which stay local-only)
- on signin: migrates local-user follows to authenticated user

## sync

`pull()` - fetches remote follows, marks as synced
`sync()` - full bidirectional sync on signin:
1. pull remote follows
2. migrate local-user follows to authenticated user  
3. push unsynced r4 channels to remote
4. clean up local-user entries

v1 channels (from firebase import) can't sync to r4, marked as `source: 'v1'` and stay local.

## api

`followChannel(followerId, channelId)` - follow with immediate r4 push
`unfollowChannel(followerId, channelId)` - unfollow with immediate r4 push  
`getFollowers(followerId)` - auto-pulls from remote if empty
`isFollowing(followerId, channelId)` - check follow status

## files
- lib/r5/followers.js - sync logic
- lib/api.js - follow/unfollow/getFollowers
- routes/following/ - ui
