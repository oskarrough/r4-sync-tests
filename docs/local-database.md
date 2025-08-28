The local database is a (pglite) PostgreSQL database in the browser via WASM.

Use the `src/lib/r5` or the CLI to interact with it.

## When creating new tables

- update or create a new migration in ./src/lib/migrations/
- reference the migration in ./src/lib/r5/db
- add the table(s) to `drop()` function

## Migrations

Migrations are applied automatically on load.
Migrations must be written in a way that they can be run multiple times e.g. `if not exists`.

While we are in alpha, it's ok to change existing migrations. Once in production: new migrations only.

Refer with the `types.ts` and `migrations/*.js` for the exact schema.

