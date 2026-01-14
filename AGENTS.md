# R5

Prototype local-first music player for Radio4000. SvelteKit + Svelte 5, @radio4000/sdk, Tanstack DB.

## Task-based agent approach

1. Operate on tasks with @plan.md as your scratchpad
2. Research, ask user for guidance when things aren't clear, or strategically important
3. Review research, create a plan
4. Implement plan

## Documentation

Read the @docs folder for more. Continously update our documentation as we go and learn.

## File overview

```
/src/lib/types.ts      -- type definitions for the most important interfaces
/src/lib/api.js        -- reusable data operations
/src/lib/utils.ts      -- reusable utility functions
/src/lib/tanstack      -- data and state
/src/lib/components    -- where components go
/src/routes            -- our pages
```

## Database and state

The app orchestrates data between local browser memory and the remote PostgreSQL database. Database is state. We limit component state, avoid multiple stores. Read more in `docs/tanstack.md`

`appState` (src/lib/app-state.svelte.ts) is a global reactive object for UI state - player, queue, theme, user preferences. Auto-persists to localStorage. Debug at /debug/appstate.

We're usually dealing with one of three "tables":

```sql
appState  -- global application state
channels  -- radio channels (id, slug, name, description, ...)
tracks    -- music tracks (id, url, title, description, ...)
```

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
- Avoid type casts to silence errors. Casts like `/** @type {any} */` or `as Type` are bloat that hide real issues.

## HTML/CSS

- Don't redefine button styles etc., as we have global styles in `styles/style.css`
- Use CSS custom property variables from variables.css (colors, font-sizing)
- Right semantic elements (`<section>`, `<article>`, `<figure>`). No unnecessary container `<div>`s. Write HTML/CSS without classes by default. Use semantic elements, ARIA roles, data-\* attributes, and custom elements to express state/variants. Style via structure and modern selectors (:has, :where, :is), not class soup. Only introduce a class for 3rd-party hooks or proven reuse. Don't add arbitrary spacing or typography changes unless requested. Let browser defaults handle spacing, typography and most layout. Focus on styles critical for functionality. Reuse CSS custom property variables.

## Svelte 5 tips

Use $derived liberally. $derived can be mutated!
`await` can be used inside components' `<script>`, `$derived()`and markup.
Use `bind:this`to get a reference to a DOM element. You can even export methods on it.
import`page`from`$app/state` (and not `$app/stores`)
Snippets can be used for reusable "mini" components, when a file is too much https://svelte.dev/docs/svelte/snippet.
Attachments can be used for reusable behaviours/effects on elements https://svelte.dev/docs/svelte/@attach.

## Debug Tricks

`window.r5` exposes sdk, appState, queryClient, tracksCollection, channelsCollection. Example: `[...window.r5.channelsCollection.state.values()].map(...`
Format and lint the code using `bun run lint`. Or use the claude code command /lint-test.
When valuable, we can write tests using vitest. Put them next to the original file and name them xxx.test.js. Run tests with: `bun test [optional-name]`
There is no need to start a dev server, as the user does it.
When searching for text or files, prefer using `rg` or `rg --files` respectively because `rg` is much faster than alternatives like `grep`.

## Key packages

- @radio4000/sdk (see @docs/radio4000-sdk.md)
- @radio4000/components (see https://github.com/radio4000/components)

## r4 CLI

A separate project, can help to debug remote data. Explore `r4 --help` commands as needed.

## Tanstack notes

- @docs/tanstack.md

## Writing style (guides, docs, explanations)

Lead with the point. Skip preambles, start mid-thought when context is clear.

Assume domain knowledge. Say "use debouncing" not "you might want to consider implementing a debouncing mechanism." Reference concepts directly without basic explanations.

Natural prose over formatting tricks. Never do "**bold**: explanation" syntax. Prefer flowing paragraphs to numbered lists when the content permits. Sentence case for titles.

Terse and precise. Expand reasoning only when asked. Point out flaws directly: "that breaks because..." not "one consideration might be..."

Dry wit welcome. Channel the sensibility of someone who finds elegance in plain text and thinks most abstractions are premature.
