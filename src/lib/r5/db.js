import {live} from '@electric-sql/pglite/live'
import {PGliteWorker} from '@electric-sql/pglite/worker'
import {logger} from '../logger.js'
import migration01sql from '../migrations/01-initial-schema.js'
import migration02sql from '../migrations/02-more-tables.js'
import migration03sql from '../migrations/03-functions-and-views.js'
import migration04sql from '../migrations/04-download-tracking.js'
import migration05sql from '../migrations/05-channels-filter-state.js'

const browser = typeof window !== 'undefined'
const log = logger.ns('db').seal()

// This will limit the amount of channels pulled.
export const debugLimit = 4000

// Use worker for database operations (enabled by default)
const useWorker = true

const migrations = [
	{name: '01-initial-schema', sql: migration01sql},
	{name: '02-more-tables', sql: migration02sql},
	{name: '03-functions-and-views', sql: migration03sql},
	{name: '04-download-tracking', sql: migration04sql},
	{name: '05-channels-filter-state', sql: migration05sql}
]

/**
 * Prevents concurrent initialization of the PG database
 * @type {Promise<import('@electric-sql/pglite/live').PGliteWithLive> | null} */
let pgInitPromise = null

/** @type {import('@electric-sql/pglite/live').PGliteWithLive} */
export let pg

/** Prevents concurrent migration attempts
 * @type {Promise<void> | null} */
let migrationPromise = null

/**
 * @param {boolean} persist - Switch between in-memory and OPFS persisted indexeddb for PostgreSQL
 * @returns {Promise<import('@electric-sql/pglite/live').PGliteWithLive>}
 */

export async function createPg(persist = browser) {
	// Check globalThis first for true singleton behavior in browser
	if (browser && globalThis.__r5_pg_instance) {
		pg = globalThis.__r5_pg_instance
		return pg
	}

	// If already initializing, wait for that to complete
	if (pgInitPromise) {
		return pgInitPromise
	}

	if (!pg) {
		// Store the initialization promise to prevent concurrent calls
		pgInitPromise = (async () => {
			const dataDir = browser ? (persist ? 'idb://radio4000test2' : 'memory://') : './cli-db'

			if (browser && useWorker) {
				log.debug('creating PGLite worker')
				pg = await PGliteWorker.create(
					new Worker(new URL('./db-worker.js', import.meta.url), {
						type: 'module'
					}),
					{
						dataDir: dataDir,
						extensions: {
							live
						}
					}
				)
			} else if (browser) {
				// Browser without worker
				log.debug('creating PGLite browser')
				const {PGlite} = await import('@electric-sql/pglite')
				const {pg_trgm} = await import('@electric-sql/pglite/contrib/pg_trgm')
				pg = await PGlite.create({
					dataDir: dataDir,
					relaxedDurability: true,
					extensions: {
						live,
						pg_trgm
					}
				})
			} else {
				// CLI/Node fallback
				log.log('creating PGLite node')
				const {PGlite} = await import('@electric-sql/pglite')
				const {pg_trgm} = await import('@electric-sql/pglite/contrib/pg_trgm')
				pg = await PGlite.create({
					dataDir: dataDir,
					relaxedDurability: true,
					extensions: {
						live,
						pg_trgm
					}
				})
			}

			// Store in globalThis for true singleton in browser
			if (browser) {
				globalThis.__r5_pg_instance = pg
			}

			// Clear the promise once done
			pgInitPromise = null
			return pg
		})()

		// Wait for initialization to complete
		pg = await pgInitPromise
	}
	return pg
}

/**
 * Get pg instance, creating it lazily if needed
 * @returns {Promise<import('@electric-sql/pglite/live').PGliteWithLive>}
 */
export async function getPg() {
	// Check globalThis first for true singleton
	if (browser && globalThis.__r5_pg_instance) {
		pg = globalThis.__r5_pg_instance
		return pg
	}

	if (!pg) {
		pg = await createPg()
		// Auto-migrate on first database creation
		await migrate()
	}
	return pg
}

/**
 * Set pg instance manually (for tests/CLI)
 * @param {import('@electric-sql/pglite/live').PGliteWithLive} instance
 */
export function setPg(instance) {
	pg = instance
}

export async function drop() {
	pg = await createPg()

	// We are deleting rows from all tables before dropping,
	// as the UI re-renders better to this than just dropping tables
	// Wrap in try-catch to handle missing tables in older schemas
	const tablesToDelete = ['app_state', 'track_edits', 'followers', 'play_history', 'tracks', 'channels']

	for (const table of tablesToDelete) {
		try {
			await pg.exec(`DELETE FROM ${table};`)
		} catch {
			// Table doesn't exist yet, that's ok
		}
	}

	// Drop tables with CASCADE to handle dependencies
	await pg.sql`drop table if exists app_state CASCADE;`
	await pg.sql`drop table if exists track_edits CASCADE;`
	await pg.sql`drop table if exists followers CASCADE;`
	await pg.sql`drop table if exists play_history CASCADE;`
	await pg.sql`drop table if exists tracks CASCADE;`
	await pg.sql`drop table if exists channels CASCADE;`
	await pg.sql`drop table if exists migrations CASCADE;`
	await pg.sql`drop table if exists track_meta CASCADE;`

	log.log('dropped db')
}

export async function exportDatabase() {
	if (!pg) throw new Error('Database not initialized')
	const file = await pg.dumpDataDir()
	// Download the dump
	const url = URL.createObjectURL(file)
	const a = document.createElement('a')
	a.href = url
	const timestamp = new Date().toISOString().replace(/:/g, '-')
	a.download = `r5-test-${timestamp}.tar.gz`
	a.click()
}

/** Runs a list of SQL migrations on the database */
export async function migrate() {
	// If migration is already in progress, wait for it to complete
	if (migrationPromise) {
		return migrationPromise
	}

	// Start migration and store the promise
	migrationPromise = (async () => {
		if (!pg) pg = await createPg()
		await pg.exec(`
			create table if not exists migrations (
				id serial primary key,
				name text not null unique,
				applied_at timestamp default current_timestamp
			);
		`)
		const [result] = await pg.exec('select name from migrations')
		const appliedMigrationNames = result.rows.map((x) => x.name)
		for (const migration of migrations) {
			if (!appliedMigrationNames.includes(migration.name)) {
				try {
					await pg.exec(migration.sql)
					await pg.query('insert into migrations (name) values ($1);', [migration.name])
					log.debug(`migration_applied ${migration.name}`)
				} catch (err) {
					log.error('migration_error', err, migration, appliedMigrationNames)
					throw err
				}
			}
		}
		log.debug('migrated db')
	})()

	try {
		await migrationPromise
	} finally {
		// Clear the promise when done (success or failure)
		migrationPromise = null
	}
}

export async function reset() {
	await drop()
	await migrate()
	log.log('reset db')
}
