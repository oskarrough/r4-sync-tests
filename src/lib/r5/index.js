import * as channels from './channels.js'
import * as db from './db.js'
import * as pull from './pull.js'
import search from '../search.js'
import * as tags from './tags.js'
import * as tracks from './tracks.js'

export const r5 = {
	channels,
	tracks,
	tags,
	search,
	pull: pull.everything,
	db
}
