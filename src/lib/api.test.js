import {beforeEach, afterEach} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {live} from '@electric-sql/pglite/live'
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm'
import migration01sql from './migrations/01-initial-schema.sql?raw'
import migration02sql from './migrations/02-more-tables.sql?raw'
import migration03sql from './migrations/03-functions-and-views.sql?raw'

const migrations = [
	{name: '01-initial-schema', sql: migration01sql},
	{name: '02-more-tables', sql: migration02sql},
	{name: '03-functions-and-views', sql: migration03sql}
]

/** @type {import('@electric-sql/pglite/live').PGliteWithLive} */
let testPg

beforeEach(async () => {
	// Create fresh in-memory database for each test
	testPg = await PGlite.create({
		dataDir: 'memory://',
		extensions: {
			live,
			pg_trgm
		}
	})

	// Apply migrations manually for test isolation
	for (const migration of migrations) {
		await testPg.exec(migration.sql)
	}

	// Seed a channel to satisfy FK on tracks
	await testPg.sql`
		INSERT INTO channels (name, slug) VALUES ('Test Channel', 'test-channel')
	`
})

afterEach(async () => {
	if (testPg) {
		await testPg.close()
	}
})
