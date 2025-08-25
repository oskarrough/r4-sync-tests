import {PGlite} from '@electric-sql/pglite'
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm'
import {live} from '@electric-sql/pglite/live'
import {afterEach, beforeEach} from 'vitest'
import migration01sql from './migrations/01-initial-schema.js'
import migration02sql from './migrations/02-more-tables.js'
import migration03sql from './migrations/03-functions-and-views.js'

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
