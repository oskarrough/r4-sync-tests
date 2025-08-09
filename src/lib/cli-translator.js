/**
 * CLI translator - converts GitHub CLI-style commands to r5 API calls
 * Example: "r5 channels" → {fn: r5.channels, args: []}
 */

import {r5} from '$lib/experimental-api'

/**
 * Parse CLI command into executable function and arguments
 * @param {string} command - CLI command string
 * @returns {{fn: Function, args: any[], raw: string} | {error: string, raw: string}}
 */
export function parseCommand(command) {
	const raw = command.trim()
	const parts = raw.split(/\s+/)

	if (!parts[0] || parts[0] !== 'r5') {
		return {error: 'Commands must start with "r5"', raw}
	}

	const [, subcommand, ...args] = parts

	if (!subcommand) {
		return {error: 'Missing subcommand. Try: r5 channels, r5 tracks, r5 search', raw}
	}

	try {
		switch (subcommand) {
			case 'channels':
				return parseChannelsCommand(args, raw)
			case 'tracks':
				return parseTracksCommand(args, raw)
			case 'search':
				return parseSearchCommand(args, raw)
			case 'queue':
				return parseQueueCommand(args, raw)
			case 'db':
				return parseDbCommand(args, raw)
			default:
				return {error: `Unknown subcommand: ${subcommand}`, raw}
		}
	} catch (err) {
		return {error: err.message, raw}
	}
}

function parseChannelsCommand(args, raw) {
	const [source, ...rest] = args

	switch (source) {
		case undefined:
			// r5 channels
			return {fn: r5.channels, args: [], raw}
		case 'local':
			// r5 channels local
			return {fn: r5.channels.local, args: [], raw}
		case 'r4':
			// r5 channels r4
			return {fn: r5.channels.r4, args: [], raw}
		case 'pull': {
			// r5 channels pull [slug]
			const slug = rest[0]
			return {fn: r5.channels.pull, args: slug ? [{slug}] : [], raw}
		}
		case 'v1':
			// r5 channels v1
			return {fn: r5.channels.v1, args: [], raw}
		default:
			// r5 channels oskar (filter by slug)
			return {fn: r5.channels, args: [{slug: source}], raw}
	}
}

function parseTracksCommand(args, raw) {
	const [action, ...rest] = args

	switch (action) {
		case undefined:
			// r5 tracks
			return {fn: r5.tracks, args: [], raw}
		case 'local': {
			// r5 tracks local [slug]
			const slug = rest[0]
			return {fn: r5.tracks.local, args: slug ? [{slug}] : [], raw}
		}
		case 'r4': {
			// r5 tracks r4 <slug>
			const slug = rest[0]
			if (!slug) throw new Error('r4 tracks requires channel slug')
			return {fn: r5.tracks.r4, args: [{slug: slug}], raw}
		}
		case 'pull': {
			// r5 tracks pull <slug>
			const slug = rest[0]
			if (!slug) throw new Error('pull tracks requires channel slug')
			return {fn: r5.tracks.pull, args: [{slug: slug}], raw}
		}
		case 'v1': {
			// r5 tracks v1 channel firebase_id
			const [v1Channel, firebaseId] = rest
			if (!v1Channel || !firebaseId) {
				throw new Error('v1 tracks requires channel and firebase_id')
			}
			return {fn: r5.tracks.v1, args: [{channel: v1Channel, firebase: firebaseId}], raw}
		}
		default:
			// r5 tracks <slug>
			return {fn: r5.tracks, args: [{slug: action}], raw}
	}
}

function parseSearchCommand(args, raw) {
	const [type, ...query] = args

	if (!type) {
		throw new Error('search requires a query')
	}

	switch (type) {
		case 'channels': {
			// r5 search channels jazz
			const channelQuery = query.join(' ')
			if (!channelQuery) throw new Error('search channels requires query')
			return {fn: r5.search.channels, args: [channelQuery], raw}
		}
		case 'tracks': {
			// r5 search tracks jazz
			const trackQuery = query.join(' ')
			if (!trackQuery) throw new Error('search tracks requires query')
			return {fn: r5.search.tracks, args: [trackQuery], raw}
		}
		default: {
			// r5 search jazz (search all)
			const allQuery = [type, ...query].join(' ')
			return {fn: r5.search, args: [allQuery], raw}
		}
	}
}

function parseQueueCommand(args, raw) {
	const [action, ...rest] = args

	switch (action) {
		case 'add': {
			// r5 queue add trackId
			const trackId = rest[0]
			if (!trackId) throw new Error('queue add requires track ID')
			return {fn: r5.queue.add, args: [trackId], raw}
		}
		case 'set': {
			// r5 queue set trackId1,trackId2
			const trackIds = rest
				.join(' ')
				.split(',')
				.map((id) => id.trim())
			return {fn: r5.queue.set, args: [trackIds], raw}
		}
		case 'clear':
			// r5 queue clear
			return {fn: r5.queue.clear, args: [], raw}
		default:
			throw new Error(`Unknown queue action: ${action}`)
	}
}

function parseDbCommand(args, raw) {
	const [action] = args

	switch (action) {
		case 'reset':
			// r5 db reset
			return {fn: r5.db.reset, args: [], raw}
		case 'export':
			// r5 db export
			return {fn: r5.db.export, args: [], raw}
		case 'migrate':
			// r5 db migrate
			return {fn: r5.db.migrate, args: [], raw}
		default:
			throw new Error(`Unknown db action: ${action}`)
	}
}

/**
 * Get available completions for a partial command
 * @param {string} partial - Partial command string
 * @returns {string[]} - Array of possible completions
 */
export function getCompletions(partial) {
	const parts = partial.trim().split(/\s+/)

	if (parts.length === 1) {
		// Complete "r5"
		return partial.startsWith('r') ? ['r5'] : []
	}

	if (parts.length === 2) {
		// Complete subcommands
		const subcommands = ['channels', 'tracks', 'search', 'queue', 'db']
		return subcommands.filter((cmd) => cmd.startsWith(parts[1])).map((cmd) => `r5 ${cmd}`)
	}

	if (parts.length === 3) {
		const [, subcommand, partial_arg] = parts

		switch (subcommand) {
			case 'channels': {
				const channelSources = ['local', 'r4', 'pull', 'v1']
				return channelSources
					.filter((src) => src.startsWith(partial_arg))
					.map((src) => `r5 channels ${src}`)
			}
			case 'tracks': {
				const trackSources = ['local', 'r4', 'pull', 'v1']
				return trackSources
					.filter((src) => src.startsWith(partial_arg))
					.map((src) => `r5 tracks ${src}`)
			}
			case 'search': {
				const searchTypes = ['channels', 'tracks', 'all']
				return searchTypes
					.filter((type) => type.startsWith(partial_arg))
					.map((type) => `r5 search ${type}`)
			}
			case 'queue': {
				const queueActions = ['add', 'set', 'clear']
				return queueActions
					.filter((action) => action.startsWith(partial_arg))
					.map((action) => `r5 queue ${action}`)
			}
			case 'db': {
				const dbActions = ['reset', 'export', 'migrate']
				return dbActions
					.filter((action) => action.startsWith(partial_arg))
					.map((action) => `r5 db ${action}`)
			}
		}
	}

	return []
}
