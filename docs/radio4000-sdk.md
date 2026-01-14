# @radio4000/sdk

JavaScript SDK for Radio4000. Works in browser and node.js.

Full source: https://github.com/radio4000/sdk

## Usage

```js
import {sdk} from '@radio4000/sdk'

const {data: channels, error} = await sdk.channels.readChannels()
```

Browser via CDN:

```html
<script type="module">
	import {sdk} from 'https://cdn.jsdelivr.net/npm/@radio4000/sdk/+esm'
	const {data: channels} = await sdk.channels.readChannels(5)
</script>
```

Custom Supabase instance:

```js
import {createClient} from '@supabase/supabase-js'
import {createSdk} from '@radio4000/sdk'

const supabase = createClient(url, key)
const sdk = createSdk(supabase)
```

## Overview

```
 Radio4000 SDK
  │
  ├── createSdk(supabaseClient) → SDK
  │
  ├── auth/
  │   ├── signUp({email, password, options?}) → Promise
  │   ├── signIn({email, password, options?}) → Promise
  │   ├── signOut() → Promise
  │   └── via sdk.supabase.auth:
  │       ├── signInWithOtp({email}) → Promise (magic link)
  │       └── signInWithOAuth({provider}) → Promise (google or facebook)
  │
  ├── users/
  │   ├── readUser() → Promise<{data?, error?}>
  │   └── deleteUser() → Promise
  │
  ├── channels/
  │   ├── createChannel({id?, name, slug, userId?}) → Promise<SupabaseResponse>
  │   ├── updateChannel(id, changes) → Promise<SupabaseResponse>
  │   ├── deleteChannel(id) → Promise
  │   ├── readChannel(slug) → Promise<SupabaseResponse>
  │   ├── readChannels(limit?) → Promise<SupabaseResponse>
  │   ├── readChannelTracks(slug, limit?) → Promise<SupabaseResponse>
  │   ├── readUserChannels() → Promise
  │   ├── canEditChannel(slug) → Promise<Boolean>
  │   ├── createImage(file, tags?) → Promise
  │   ├── followChannel(followerId, channelId) → Promise<SupabaseResponse>
  │   ├── unfollowChannel(followerId, channelId) → Promise<SupabaseResponse>
  │   ├── readFollowers(channelId) → Promise<SupabaseResponse>
  │   └── readFollowings(channelId) → Promise<SupabaseResponse>
  │
  ├── tracks/
  │   ├── createTrack(channelId, fields) → Promise<SupabaseResponse>
  │   ├── updateTrack(id, changes) → Promise<SupabaseResponse>
  │   ├── deleteTrack(id) → Promise
  │   ├── readTrack(id) → Promise<SupabaseResponse>
  │   └── canEditTrack(track_id) → Promise<Boolean>
  │
  ├── firebase/
  │   ├── readChannel(slug) → Promise<{data?, error?}>
  │   ├── readChannels({limit?}) → Promise<{data?, error?}>
  │   ├── readTracks({channelId?, slug?}) → Promise<{data?, error?}>
  │   ├── parseChannel(rawChannel) → v2Channel
  │   └── parseTrack(rawTrack, channelId, channelSlug) → v2Track
  │
  ├── search/
  │   ├── searchChannels(query, {limit?}) → Promise<{data?, error?}>
  │   ├── searchTracks(query, {limit?}) → Promise<{data?, error?}>
  │   └── searchAll(query, {limit?}) → Promise<{data: {channels, tracks}, error?}>
  │
  ├── browse/
  │   ├── query({page?, limit?, table?, select?, orderBy?, orderConfig?, filters?}) → Promise
  │   ├── supabaseOperators: Array<string>
  │   └── supabaseOperatorsTable: Object
  │
  ├── utils/
  │   └── extractTokens(str) → {mentions: string[], tags: string[]}
  │
  └── supabase (Supabase client instance)

  Almost every method returns the {data, error} format
```
