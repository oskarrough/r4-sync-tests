# What is this? R5

This file provides guidance to Claude and other LLMs working with code in this repository. Humans also welcome.
A prototype local-first music player for Radio4000. The name in dev is `r5`.
SvelteKit + Svelte 5 runes, PGlite (client-side postgres), @radio4000/sdk, jsdoc and sometimes typescript

## Planning

Use `todo.txt` to see current prios and find things to do.

## Documentation

Read `docs/index.md` for more. 
Continously update `./docs/` folder with learnings, more complex features

## File overview

```
/src/lib/types.ts      -- type definitions for the most important interfaces
/src/lib/r5/index.js   -- local/remote data synchronization
/src/lib/r5/db.js	   -- local pglite database
/src/lib/migrations/   -- sql migration files
/src/lib/api.js        -- reusable data operations
/src/lib/utils         -- the odd reusable function
/src/lib/dates         -- dates helpers
/src/lib/components    -- where components go
```

## Database and state

The app works with three sources:

1. Local PostgreSQL (client-side, PGlite) via `import {pg} from $lib/db` - primary interface, allows reads/writes
2. Remote PostgreSQL (radio4000/Supabase) - public reads, authenticated writes
3. Local json and remote API for v1 (firebase realtime db)

```sql
app_state    -- single row with id 1, all application state
channels     -- radio channels (id, name, slug, description, image)
tracks       -- music tracks (id, channel_id, url, title, description, ...)
```

Database is state. Most application state (UI state, user preferences, everything) lives in the local `app_state` table. Limited component state, avoid stores. The $lib/app-state.svelte automatically is a proxy and automatically persited to pglite via layout.svelte.

Read more in `docs/local-database.md` and `docs/r5-sdk.md`.

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

## HTML/CSS

- Use semantic elements like `header` or `menu` instead of divs
- Rely existing global styles over new classes
- Don't redefine button styles etc., as we have global styles in `styles/style.css`
- Only create CSS classes when really needed
- Use CSS custom property variables from variables.css (colors, font-sizing)

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
Prefer $app/state over $app/store

## Debug Tricks

You can't run queries on the local pglite database, because it is in the browser. You can ask me to run SQL queries on the local db for you with this snippet: (await window.r5.pg.sql`select * from tracks_with_meta limit 2`).rows


Format and lint the code using `bun run lint`. Or use the claude code command /lint-test.

When valuable, we can write tests using vitest. Put them next to the original file and name them xxx.test.js. Run tests with: `bun test [optional-name]`

See docs/cli.md. The project has a CLI tool for database operations, run it with: `bun src/lib/cli.ts --help`. It is very useful for you to verify data orchestration works. Can also be piped, used with jq etc. The CLI does not share db with the web app.

Ask me to perform queries on the db database for you, if it helps:
(await window.r5.pg.sql`select * from app_state where id = 1`).rows[0]

Do not attempt to start the dev server. The user will do that.
