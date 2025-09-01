# Keyboard shortcuts

Keyboard shortcuts call functions from $lib/api.js and other files.

Visit /settings which includes <KeyboardEditor> to customize shortcuts. Your config is stored in the local database.

```
{
	"j": "toggleQueuePanel",
	"$mod+k": "openSearch",
}
```

The actual keyboard events are attached through <KeyboardShortcuts> in layout.svelte.
