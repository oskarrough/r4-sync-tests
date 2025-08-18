import * as channels from './channels.js'
import * as db from './db.js'
import * as pull from './pull.js'
import * as search from './search.js'
import * as tracks from './tracks.js'

export const r5 = {
	channels,
	tracks,
	search,
	pull: pull.everything,
	db
}
