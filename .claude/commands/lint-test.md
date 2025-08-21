## Linting

Run `bun run lint` to format and lint the entire codebase.

We also have `biome` set up, but it doesn't handle .svelte files. Only use it on .js and .ts files and be critical with its findings.

```
bunx biome lint <path>
```

## Testing

Run tests with

1. `bun run test` (vitest)
2. `bun test` (tests written with bun)

Instead of blindly fixing existing tests, ask if this test is worthwhile. Ask the user for guidance, if you're in doubt of how it is supposed to work.

### PGlite Database Issues

If tests fail with `Aborted(). Build with -sASSERTIONS for more info.` errors, the local PGlite database may be corrupted. Fix by removing the CLI database:

```bash
rm -rf ./cli-db
```

This forces PGlite to create a fresh database instance for tests.
