# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
It's called claude.md so it picks up automatically without mentioning it, but really it's sound guidance
for anyone working on this project.

# What is this? R5 - Local-First Music Player

A local-first music player for radio4000.

SvelteKit + Svelte 5 runes, PGlite (client-side postgres), @radio4000/sdk, jsdoc and sometimes typescript

## File Organization

```
/docs 				   -- feature design docs
/src/lib/db.ts         -- local db, schema
/src/lib/migrations/   -- sql migration files
/src/lib/api.js        -- reusable data operations
/src/lib/sync.js       -- local/remote data synchronization
/src/lib/live-query.js -- local, reactive db queries
/src/lib/utils.js      -- the odd reusable function
/src/lib/components    -- where components go
/src/lib/types.ts      -- type definitions for database schemas and app state
/todo.txt`			   -- current priorities and planned improvements
```

## Database and state

The app works with two databases:

1. Local PostgreSQL (client-side, PGlite) via `import {pg} from $lib/db` - primary interface, allows reads/writes
2. Remote PostgreSQL (radio4000/Supabase) via @radio4000/sdk - public reads, authenticated writes, no auto-sync

- Database is state. All application state (UI state, user preferences, everything) lives in the local `app_state` table. Limited component state, avoid stores - everything persisted and unified.
- The $lib/app-state.svelte automatically is a proxy and automatically persited to pglite
- No server-side code here, yet, all client side

The local schema can be updated at any time, be generous with migrations:

1. During prototype phase: update existing migrations in `/src/lib/migrations/`
2. Once in production: create new migrations only
3. Add to list in `db.ts`

```sql
app_state    -- single row with id 1, all application state
channels     -- radio stations (id, name, slug, description, image)
tracks       -- music tracks (id, channel_id, url, title, tags, mentions)
```

Use $lib/types.ts to define them and reuse across the codebase.

## Debugging

- `window.r5.pg` - direct database access
- `window.r5.sdk` - radio4000 api client
- inspect `app_state` table in devtools for current state

You can't run queries on the local pglite database, because it is in the browser. You can ask me to run SQL queries on the local db for you with this snippet: (await window.r5.pg.sql`select * from tracks limit 2`).rows

### Using pglite

See docs/pglite.txt

## API

In `/src/lib/api.js` you can find reusable functions for data operations.

## Svelte 5 syntax

```js
let items = $state([])
let filtered = $derived(items.filter((item) => !item.hidden))
$effect(() => {
	items.push({hidden: false})
})
```

Snippets can be used for reusable "mini" components, when a file is too much https://svelte.dev/docs/svelte/snippet.
Use $derived liberally. $derived can be mutated!
Attachments can be used for reusable behaviours/effects on elements https://svelte.dev/docs/svelte/@attach.
Use `bind:this` to get a reference to the element. You can even export methods on it.

## HTML/CSS

- Semantic HTML over divs
- Rely existing global styles over new classes
- Only create CSS classes when really needed
- Use CSS custom property variables from variables.css (colors, font-sizing)
- Use semantic elements like header menu instead

## Code Style

- Direct property access: Avoid getters/setters when direct property access works
- Minimal abstraction: Keep code paths direct and clear without unnecessary layers
- Focus on next actions, not recaps
- Self-documenting code: Use clear naming that makes comments unnecessary
- Zero non-essential comments: Do not comment on what the code does - only explain WHY when not obvious
- Exports: Prefer named exports over default exports
- Types: Prefer jsdoc, don't obsess over typescript
- Pass primitives directly, avoid wrapper objects around simple data
- Use literal objects directly, avoid helper functions for basic object creation
- Meaningful methods: Methods should do something meaningful beyond simple delegation
- Use domain-specific verbs that match user mental models
- Pure functions for composability in api/utils/data operations
- Optimistic execution - trust in methods, let errors throw

## Debug Tricks

Ask me to perform queries for you, if it helps:
(await window.r5.pg.sql`select * from app_state where id = 1`).rows[0]

## Linting and formatting

Format and lint the code using `bun run lint`. Always good to do this before committing.  
Additionally and optionally, use `bun run lint2` for even more things to review using Biome. Note that Biome doesn't outside script tags in .svelte files.

## Testing

When valuable, we can write tests using vitest. Put them next to the original file and name them xxx.test.js. Run tests with: `bun test`

claude code: you do not need to start the dev server.
