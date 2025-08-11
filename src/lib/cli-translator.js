/**
 * CLI translator - converts GitHub CLI-style commands to r5 API calls
 * Example: "r5 channels pull oskar" → {fn: r5.channels.pull, args: [{slug: "oskar"}]}
 */

import {r5} from './r5'

const COMMANDS = {
	channels: {
		methods: ['local', 'r4', 'pull', 'v1', 'outdated'],
		argTransforms: {
			local: (args) => (args[0] ? [{slug: args[0]}] : []),
			r4: (args) => (args[0] ? [{slug: args[0]}] : []),
			pull: (args) => (args[0] ? [{slug: args[0]}] : []),
			v1: (args) => (args[0] ? [{slug: args[0]}] : []),
			outdated: (args) => {
				if (!args[0]) throw new Error('outdated requires channel slug')
				return [args[0]]
			},
			default: (args) => (args[0] ? [{slug: args[0]}] : [])
		}
	},
	tracks: {
		methods: ['local', 'r4', 'pull', 'v1'],
		argTransforms: {
			local: (args) => (args[0] ? [{slug: args[0]}] : []),
			r4: (args) => [{slug: args[0]}],
			pull: (args) => [{slug: args[0]}],
			v1: (args) => {
				const [channel, firebase] = args
				if (!channel || !firebase) throw new Error('v1 tracks requires channel and firebase_id')
				return [{channel, firebase}]
			},
			default: (args) => (args[0] ? [{slug: args[0]}] : [])
		}
	},
	search: {
		methods: ['channels', 'tracks'],
		argTransforms: {
			channels: (args) => {
				const query = args.join(' ')
				if (!query) throw new Error('search channels requires query')
				return [query]
			},
			tracks: (args) => {
				const query = args.join(' ')
				if (!query) throw new Error('search tracks requires query')
				return [query]
			},
			default: (args, method) => {
				// "search jazz" -> search all with "jazz"
				const query = [method, ...args].join(' ')
				return [query]
			}
		}
	},
	db: {
		methods: ['reset', 'export', 'migrate'],
		argTransforms: {
			default: () => []
		},
		defaultHelp: 'Available commands: reset, export, migrate'
	}
}

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

	const [, subcommand, method, ...args] = parts

	if (!subcommand) {
		return {error: 'Missing subcommand. Try: r5 help', raw}
	}

	if (subcommand === 'help') {
		return {
			fn: async () => `R5 - Local-First Music Player CLI

Usage:
  r5 channels [local|r4|pull|v1|outdated] [<slug>]
  r5 tracks (local [<slug>] | r4 <slug> | pull <slug> | v1 <channel> <firebase>)
  r5 search [channels|tracks] <query>
  r5 db (reset|migrate|export)

Examples:
  r5 channels ko002          List local channel @ko002
  r5 channels pull           Pull all channels from remote
  r5 channels pull ko002     Pull channel @ko002 from remote
  r5 channels v1 ko002       List v1 (firebase) channel @ko002
  r5 channels outdated ko002 Check if @ko002 needs updating
  r5 tracks pull ko002       Pull tracks for @ko002 from remote
  r5 search jazz piano       Search everything for "jazz piano"
  r5 db migrate              Run database migrations`,
			args: [],
			raw
		}
	}

	try {
		const config = COMMANDS[subcommand]
		if (!config) {
			return {error: `Unknown subcommand: ${subcommand}. Try: r5 help`, raw}
		}

		// Get the target function from r5 API
		let fn = r5[subcommand]
		let transform = config.argTransforms?.default || (() => args)

		// If method specified and exists, use it
		if (method && config.methods?.includes(method)) {
			fn = r5[subcommand][method]
			transform = config.argTransforms?.[method] || config.argTransforms?.default || (() => args)
		} else if (method && config.argTransforms) {
			// Method not in allowed list, treat as argument
			transform = config.argTransforms.default || (() => [method, ...args])
			args.unshift(method)
		} else if (!method && config.defaultHelp) {
			// No method specified but command has subcommands
			return {
				fn: async () => config.defaultHelp,
				args: [],
				raw
			}
		}

		if (!fn) {
			return {error: `Function not found for: ${subcommand}${method ? ' ' + method : ''}`, raw}
		}

		const transformedArgs = transform(
			method && config.methods?.includes(method) ? args : [method, ...args].filter(Boolean),
			method
		)

		return {fn, args: transformedArgs, raw}
	} catch (err) {
		return {error: err.message, raw}
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
		return partial.startsWith('r') ? ['r5'] : []
	}

	if (parts.length === 2) {
		const patterns = {
			channels: 'channels [local|r4|pull|v1|outdated] [<slug>]',
			tracks: 'tracks <method> [<args>]',
			search: 'search [channels|tracks] <query>',
			db: 'db <command>',
			help: 'help'
		}

		return Object.keys(patterns)
			.filter((cmd) => cmd.startsWith(parts[1]))
			.map((cmd) => `r5 ${patterns[cmd]}`)
	}

	if (parts.length === 3) {
		const [, subcommand, partial_arg] = parts
		const config = COMMANDS[subcommand]

		if (!config?.methods) return []

		return config.methods
			.filter((method) => method.startsWith(partial_arg))
			.map((method) => `r5 ${subcommand} ${method}`)
	}

	return []
}
