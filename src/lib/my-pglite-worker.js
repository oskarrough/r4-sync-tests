import {PGlite} from '@electric-sql/pglite'
import {live} from '@electric-sql/pglite/live'
import {worker} from '@electric-sql/pglite/worker'

/** CURRENTLY NOT USED */

const persist = true
const dbUrl = persist ? 'idb://radio4000-debug' : 'memory://'

worker({
	async init() {
		// Create and return a PGlite instance
		return await PGlite.create(dbUrl, {
			extensions: {
				live
			}
		})
	}
})
