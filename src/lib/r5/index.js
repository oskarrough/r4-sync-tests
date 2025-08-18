import * as channels from './channels.js'
import * as tracks from './tracks.js'
import * as search from './search.js'
import * as pull from './pull.js'
import {help} from './help.js'
import {getPg, setPg, createPg, exportDb, dropDb, migrateDb} from './db.js'

// Direct export, no factory needed
export const r5 = {
	channels,
	tracks,
	search,
	pull: pull.everything,
	help,
	db: {
		getPg,
		setPg, // for tests/CLI to inject custom pg
		createPg, // for explicit initialization
		export: exportDb,
		reset: dropDb,
		migrate: migrateDb
	}
}
