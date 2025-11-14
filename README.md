# R5

A prototype exploring the future of Radio4000. Local-first music player with client-side PostgreSQL that syncs with R4.

## Documentation

See the [`docs`](./docs) folder.

## Developing

```bash
bun install
bun run dev
```

## Localization

- Translations live in `messages/<languageTag>.json`. English (`en`) is the canonical source; copy it to bootstrap a new locale.
- The list of supported locales is defined once in `project.inlang/settings.json` (`languageTags`). Update that array when adding a language (e.g. add `"dk"`), create `messages/dk.json` by copying `messages/en.json`, translate the values, then recompile Paraglide:

### Example: adding Spanish (`es`)

```bash
# 1. copy the baseline strings
cp messages/en.json messages/es.json

# 2. add "es" to languageTags in project.inlang/settings.json

# 3. recompile Paraglide outputs
bunx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
```

Restart `bun run dev` and you should see “es” in the language switcher immediately; keep editing `messages/es.json` with actual translations afterward.

- RTL locales (e.g. `ar`) are automatically rendered right-to-left. Set the locale via the language switcher or `appState.language` and the `<html>` element will toggle `dir="rtl"` for those tags. When the app boots with no saved preference it tries to match `navigator.languages` and falls back to the Paraglide default.

```bash
bunx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
```

Also see [infk](https://fink.inlang.com) from [inlang](https://inlang.com) for interface to edit the language strings.

## Deploying

The `main` branch deploys to https://pg.radio4000.com for now.

## Credits

- framework = https://svelte.dev/
- local database = https://pglite.dev/
- font = https://github.com/hellogreg/firava
- icons = https://icons.obra.studio/
