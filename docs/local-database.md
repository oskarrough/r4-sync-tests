The local database is a (pglite) PostgreSQL database exposed through wasm.

Migrations are applied automatically on load.
Migrations must be written in a way that they can be run multiple times e.g. `if not exists`.

When creating new tables:

- update or create a new migration in ./src/lib/migrations/
- reference the migration in ./src/lib/db
- add the table(s) to `dropDb()` function

## PGlite API Quick Reference

query(sql, params?, options?) - single statement with params
sql`...` - template literal for queries  
exec(sql, options?) - multi-statement, no params
transaction(callback) - atomic operations

Options: rowMode, parsers, serializers, blob
Returns: Promise<Results> (query/sql) or Promise<Results[]> (exec)

```js
pg.query(query, params, callback)
pg.exec(query, params, callback)
pg.live.query(query, params, callback)  (prefered for smaller results, narrow rows)
pg.live.incrementalQuery(query, params, key, callback)  (It materialises the full result set on each update from only the changes emitted by the live.changes API. Good for large result sets and wide rows.)
pg.live.changes() a lower level API that emits the changes (insert/update/delete) that can then be mapped to mutations in a UI or other datastore.
```
