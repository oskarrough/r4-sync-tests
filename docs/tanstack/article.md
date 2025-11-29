Welcome! Today we will explore the evolution of state management in web software, and try to understand why all these new libraries and tools are emerging.

Now, usually what happens is you fetch data from an API, say a list of music **tracks**, you pass it to a component (template) which renders it to HTML. That's it.

What's the problem with this?

Nothing! Not every piece of software needs more. In many cases it's very fine to "just fetch again". No matter how we turn it, we'll trade complexity for a nicer experience. We'll look at patterns that help in offline or flaky network conditions, how to reduce the amount of network requests made.

Just fetch again works until it doesn't. If you go to another page and back, it will re-run. Re-running works but why make another request if we don't have to. Did we not already fetch the data? Why are we fetching it again? Enter caching. HTTP already supports `Cache-Control` et al. meaning subsequent requests will be fast. But it is still a network request. If your data is client-side, you only need network requests to get new, or updated data or when you write data.

Enter a client-side "store" or cache or "collection", we're not sure what to call it yet. You can store the results in LocalStorage, IndexedDB or whatever you prefer. Point is that you have a local collection of the data used in your app. But now we duplicated the data!

[insert meme with caching]

Since the data now lives in the API (source of truth) and locally, when do you fetch, when do you use the cache?

The cache is controlled by primarily two things: 1. Time-to-live (TTL), for example one minute and 2. Garbage collection (gc), for example 24 hours.

This will, or should, instruct the cache to force a new request (thereby updating the cache) if the previous request for the same data was made within the TTL. Or if the gc value has been passed as well.

Okay, let's summarize:
fetch (re-run as needed) -> data -> render template

But now, since we introduced the cache, it's slightly more complex:
fetch -> from cache? from api? -> data -> render template

When you're building an application, you don't want to answer the questions of whether to read from client cache or server every time. So we introduce a system that can do that for us, let's call it a "collection" for the sake of this article. We want a system where reads automatically respect our cache preferences. It'll return cached data when not stale, it'll send new requests to update it when needed.

What about writes?
Do we mutate data in the cache?
Do we mutate data via the API and wait for updated data?

The safest would be to 1) update data via API (maybe 400ms) 2) request new data (maybe 200ms)
but that's two network requests, and they are not benefitting from our cache.

Enter offline, optimistic mutations with rollback. Or in other words, let's try to mutate data locally,
and update it via API in the background. If the update goes through, we update the cache (but the data was already inserted). If rejected, we can rollback the transaction locally.

But how?!

Well, we need..

- a concept of mutations (functions that write data)
- a local, persisted, queue with them
- a "processor" that works through items in the mutation queue when online

Let's summarize again:
read from cache -> stale data? fetch
write to cache -> create mutation -> add to queue
while online -> process queue -> rejected by the API? rollback
