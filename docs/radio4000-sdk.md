# @radio4000/sdk

Reference for SDK methods used in r5. Full docs: https://github.com/radio4000/sdk

## Channels

```ts
sdk.channels.createChannel({id?, name, slug, userId?}) → Promise<{data?, error?}>
sdk.channels.updateChannel(id, changes) → Promise<{data?, error?}>
sdk.channels.deleteChannel(id) → Promise<{data?, error?}>
sdk.channels.readChannel(slug) → Promise<{data?, error?}>
sdk.channels.readChannels(limit?) → Promise<{data?, error?}>
sdk.channels.readUserChannels() → Promise<{data?, error?}>
sdk.channels.canEditChannel(slug) → Promise<boolean>
```

## Tracks

```ts
sdk.tracks.createTrack(channelId, {url, title, description?, discogs_url?, id?}) → Promise<{data?, error?}>
sdk.tracks.updateTrack(id, changes) → Promise<{data?, error?}>
sdk.tracks.deleteTrack(id) → Promise<{data?, error?}>
sdk.tracks.readTrack(id) → Promise<{data?, error?}>
```

## Auth

```ts
sdk.auth.signUp({email, password, options?}) → Promise<{data?, error?}>
sdk.auth.signIn({email, password, options?}) → Promise<{data?, error?}>
sdk.auth.signOut() → Promise<{data?, error?}>
```

## Users

```ts
sdk.users.readUser(jwtToken?) → Promise<{data?, error?}>
sdk.users.deleteUser() → Promise<{data?, error?}>
```

## Firebase (v1 read-only)

```ts
sdk.firebase.readChannel(slug) → Promise<{data?, error?}>
sdk.firebase.readTracks({slug?, firebaseId?}) → Promise<{data?, error?}>
sdk.firebase.parseChannel(rawChannel) → v2Channel
sdk.firebase.parseTrack(rawTrack, channelId, channelSlug) → v2Track
```

## Search

```ts
sdk.search.searchChannels(query, {limit?}) → Promise<{data?, error?}>
sdk.search.searchTracks(query, {limit?}) → Promise<{data?, error?}>
sdk.search.searchAll(query, {limit?}) → Promise<{data: {channels, tracks}, error?}>
```

## Direct Supabase access

```ts
sdk.supabase // Supabase client instance for direct queries
```
