# R5

Prototype local-first music player web application for Radio4000.  
SvelteKit + Svelte 5, @radio4000/sdk, Tanstack DB.

## Workflow

1. Choose something from @plan.md to work on
2. Write a plan
3. Implement
4. bun run check
5. Review your work
6. Finally update @plan.md

## Documentation

See the @docs folder.
The `/src/routes/_debug` folder has several examples, tests and playgrounds.

```
/src/lib/types.ts      -- type definitions for the most important interfaces
/src/lib/api.js        -- reusable data operations
/src/lib/utils         -- the odd reusable function
/src/lib/tanstack      -- data and state
/src/lib/components    -- where components go
/src/routes            -- our pages
```

- @radio4000/sdk (see @docs/radio4000-sdk.md)
- @radio4000/cli (see `r4 --help`)

## Database and state

The remote PostgreSQL (via Supabase) database is our source of truth and we can use the `r4` cli, the `@radio4000/sdk` or Supabase directly to interact with it.

```sql
channels  -- radio channels (id, slug, name, description, ...)
tracks    -- music tracks (id, url, title, description, ...)
```

Most data is also synced to local storage or IDB, either manually or with tanstack db.

The `appState` is a svelte, reactive global and local-persisted object we use for player, queue, user settings etc.

## Debug Tricks

When valuable, we can write tests using vitest.
There is no need to start a dev server, the user will do it.
Format and lint the code using `bun run check`.

We use `window.r5` to expose sdk, appState, queryClient, tracksCollection, channelsCollection. Example: `[...window.r5.channelsCollection.state.values()].map(...` for testing.

## Writing style (guides, docs, explanations)

Lead with the point. Skip preambles, start mid-thought when context is clear.

Assume domain knowledge. Say "use debouncing" not "you might want to consider implementing a debouncing mechanism." Reference concepts directly without basic explanations.

Natural prose over formatting tricks. Never do "**bold**: explanation" syntax. Prefer flowing paragraphs to numbered lists when the content permits. Sentence case for titles.

Terse and precise. Expand reasoning only when asked. Point out flaws directly: "that breaks because..." not "one consideration might be..."

Dry wit welcome. Channel the sensibility of someone who finds elegance in plain text and thinks most abstractions are premature.

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

### HTML/CSS

- Don't redefine button styles etc., as we have global styles in `styles/style.css`
- Use CSS custom property variables from variables.css (colors, font-sizing)
- Right semantic elements (`<section>`, `<article>`, `<figure>`). No unnecessary container `<div>`s. Write HTML/CSS without classes by default. Use semantic elements, ARIA roles, data-\* attributes, and custom elements to express state/variants. Style via structure and modern selectors (:has, :where, :is), not class soup. Only introduce a class for 3rd-party hooks or proven reuse. Don't add arbitrary spacing or typography changes unless requested. Let browser defaults handle spacing, typography and most layout. Focus on styles critical for functionality. Reuse CSS custom property variables.

### Svelte 5 tips

Use $derived liberally. $derived can be mutated!
`await` can be used inside components' `<script>`, `$derived()`and markup.
Use `bind:this`to get a reference to a DOM element. You can even export methods on it.
import`page`from`$app/state` (and not `$app/stores`)
Snippets can be used for reusable "mini" components, when a file is too much https://svelte.dev/docs/svelte/snippet.
Attachments can be used for reusable behaviours/effects on elements https://svelte.dev/docs/svelte/@attach.
