import {PGlite} from '@electric-sql/pglite'
import {live} from '@electric-sql/pglite/live'
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm'
import {worker} from '@electric-sql/pglite/worker'

worker({
	async init(options) {
		const browser = typeof window !== 'undefined'
		const dataDir = options.dataDir || (browser ? 'idb://radio4000test2' : './cli-db')
		
		return new PGlite({
			dataDir: dataDir,
			relaxedDurability: true,
			extensions: {
				live,
				pg_trgm
			}
		})
	}
})