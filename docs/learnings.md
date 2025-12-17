# Learnings

Patterns and preferences discovered through building r5.

## Mutable $derived for prop-initialized form state

When a component receives props that initialize editable fields, prefer `$derived(prop)` over `$state(prop)` + sync `$effect`. The derived value can be mutated by user input and automatically snaps back when the parent provides new prop values.

```js
// prefer this
let url = $derived(initialUrl)

// over this
let url = $state(initialUrl)
$effect(() => {
	url = initialUrl
})
```

Same behavior, less code, more intentional. Works because Svelte 5 deriveds are mutable.

## Global events for singleton UI

Components that appear once at app level (modals, toasts, drawers) should listen to global events rather than being controlled via `bind:this` refs. This decouples triggering from implementation and avoids rendering N instances when triggered from lists.

```js
// inside the singleton component
$effect(() => {
	const handler = (e) => open(e.detail)
	window.addEventListener('r5:openSomething', handler)
	return () => window.removeEventListener('r5:openSomething', handler)
})

// anywhere else
window.dispatchEvent(new CustomEvent('r5:openSomething', {detail: data}))
```

Event naming: `r5:` prefix, verb, entity, type. Examples: `r5:openTrackCreateModal`, `r5:trackAdded`.

## Components own their listeners

When a component responds to global events, it should handle the listener internally rather than having a parent forward events via refs. Reduces indirection, keeps related logic together.

## Group related state

When multiple state values are conceptually a unit (form fields, modal data), prefer a single object over separate primitives.

```js
// prefer
let trackData = $state({url: '', title: '', description: ''})

// over
let url = $state('')
let title = $state('')
let description = $state('')
```

Easier to reset, pass around, and reason about.

## Dead exports

If an exported function isn't called anywhere, delete it. Don't keep "just in case" code around.
