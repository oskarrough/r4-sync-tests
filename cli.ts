#!/usr/bin/env node

import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import {r5} from './src/lib/r5/index.js'
import {downloadChannel} from './src/lib/r5/download.js'

// Shared options
const sourceOpt = {
	choices: ['local', 'r4', 'v1'] as const,
	default: 'local',
	describe: 'Source to use'
}
const jsonOpt = {type: 'boolean', default: false, describe: 'Output as JSON'} as const
const limitOpt = {type: 'number', describe: 'Limit number of results'} as const
const dryRunOpt = {
	type: 'boolean',
	default: false,
	describe: 'Show what would happen without doing it'
} as const

// Source handlers
const sources = {
	channels: {local: r5.channels.local, r4: r5.channels.r4, v1: r5.channels.v1},
	tracks: {local: r5.tracks.local, r4: r5.tracks.r4, v1: r5.tracks.v1}
}

// Error handler
const handleError = (error: Error, code = 3) => {
	console.error('Error:', error.message)
	process.exit(code)
}

// Output formatters
const formatChannel = (channel: {slug: string; name?: string}) =>
	`${channel.slug}\t${channel.name || 'Untitled'}`
const formatTrack = (track: {title?: string; url: string}) =>
	`${track.title || 'Untitled'}\t${track.url}`

const outputResults = <T>(
	results: T[],
	formatter: (item: T) => string,
	json: boolean,
	limit?: number
) => {
	if (json) {
		console.log(JSON.stringify(results, null, 2))
	} else {
		const display = limit ? results.slice(0, limit) : results
		if (limit && results.length > limit) {
			display.forEach((item) => console.log(formatter(item)))
			console.log(`... and ${results.length - limit} more`)
		} else {
			display.forEach((item) => console.log(formatter(item)))
		}
	}
}

const cli = yargs(hideBin(process.argv))
	.scriptName('r5')
	.version('1.0.0')
	.help()
	.usage('$0 <command> [options]')
	.example('$0 tracks list ko002 --limit 5', 'List 5 tracks from channel')
	.example('$0 channels list --json | jq ".[].slug"', 'Get all channel slugs')
	.example('$0 tracks list ko002 --json > tracks.txt', 'Save tracks to file')
	.demandCommand(1, 'You need at least one command')
	.strict()

// Channels commands
cli.command('channels <command>', 'Manage channels', (yargs) => {
	return yargs
		.command(
			'list [slug]',
			'List channels',
			(yargs) =>
				yargs
					.positional('slug', {describe: 'Channel slug', type: 'string'})
					.options({source: sourceOpt, limit: limitOpt, json: jsonOpt}),
			async (argv) => {
				try {
					const opts = argv.slug ? {slug: argv.slug} : {limit: argv.limit}
					const results = await sources.channels[argv.source](opts)
					outputResults(results, formatChannel, argv.json, argv.limit)
				} catch (error) {
					handleError(error as Error)
				}
			}
		)
		.command(
			'pull [slug]',
			'Pull channels from remote',
			(yargs) =>
				yargs
					.positional('slug', {describe: 'Specific channel slug to pull', type: 'string'})
					.option('dry-run', dryRunOpt),
			async (argv) => {
				try {
					if (argv['dry-run']) {
						console.log(`Would pull channel${argv.slug ? ` '${argv.slug}'` : 's'}`)
						return
					}
					const opts = argv.slug ? {slug: argv.slug} : {}
					const result = await r5.channels.pull(opts)
					if (Array.isArray(result)) {
						console.log(`Pulled ${result.length} channel${result.length === 1 ? '' : 's'}`)
					} else if (result && typeof result === 'object' && 'slug' in result) {
						console.log(`Pulled channel: ${result.slug}`)
					} else {
						console.log('Channel pulled successfully')
					}
				} catch (error) {
					handleError(error as Error)
				}
			}
		)
		.demandCommand(1, 'You need to specify a channels command')
})

// Tracks commands
cli.command('tracks <command>', 'Manage tracks', (yargs) => {
	return yargs
		.command(
			'list [slug]',
			'List tracks',
			(yargs) =>
				yargs
					.positional('slug', {describe: 'Channel slug', type: 'string'})
					.options({source: sourceOpt, limit: limitOpt, json: jsonOpt}),
			async (argv) => {
				try {
					const opts = argv.slug ? {slug: argv.slug, limit: argv.limit} : {limit: argv.limit}
					const results = await sources.tracks[argv.source](opts)
					outputResults(results, formatTrack, argv.json, argv.limit)
				} catch (error) {
					handleError(error as Error)
				}
			}
		)
		.command(
			'pull <slug>',
			'Pull tracks from remote for a channel',
			(yargs) =>
				yargs
					.positional('slug', {describe: 'Channel slug', type: 'string'})
					.option('dry-run', dryRunOpt),
			async (argv) => {
				try {
					if (argv['dry-run']) {
						console.log(`Would pull tracks for channel '${argv.slug}'`)
						return
					}
					const result = await r5.tracks.pull({slug: argv.slug})
					if (Array.isArray(result)) {
						console.log(`Pulled ${result.length} track${result.length === 1 ? '' : 's'}`)
					} else {
						console.log('Tracks pulled successfully')
					}
				} catch (error) {
					handleError(error as Error)
				}
			}
		)
		.demandCommand(1, 'You need to specify a tracks command')
})

// Pull command (shorthand for pulling channel + tracks)
cli.command(
	'pull <slug>',
	'Pull channel and tracks from remote',
	(yargs) =>
		yargs
			.positional('slug', {describe: 'Channel slug', type: 'string', demandOption: true})
			.option('dry-run', dryRunOpt),
	async (argv) => {
		try {
			if (argv['dry-run']) {
				console.log(`Would pull channel and tracks for '${argv.slug}'`)
				return
			}
			await r5.pull(argv.slug)
			console.log(`Pulled channel and tracks for '${argv.slug}'`)
		} catch (error) {
			handleError(error as Error)
		}
	}
)

// Search commands
const searchHandlers = {
	channels: r5.search.channels,
	tracks: r5.search.tracks,
	all: r5.search.all
}

cli.command(
	'search [type] <query>',
	'Search channels and tracks',
	(yargs) =>
		yargs
			.positional('type', {
				choices: ['all', 'channels', 'tracks'] as const,
				default: 'all',
				describe: 'What to search'
			})
			.positional('query', {describe: 'Search query', type: 'string', demandOption: true})
			.option('json', jsonOpt),
	async (argv) => {
		try {
			if (!argv.query?.trim()) {
				throw new Error('Search query cannot be empty')
			}
			const results = await searchHandlers[argv.type](argv.query.trim())
			if (argv.json) {
				console.log(JSON.stringify(results, null, 2))
			} else {
				if (results.channels?.length) {
					console.log('Channels:')
					results.channels.forEach((channel) => console.log(`  ${formatChannel(channel)}`))
				}
				if (results.tracks?.length) {
					console.log('Tracks:')
					results.tracks.forEach((track) => console.log(`  ${formatTrack(track)}`))
				}
				if (argv.type === 'channels' && Array.isArray(results)) {
					results.forEach((channel) => console.log(formatChannel(channel)))
				}
				if (argv.type === 'tracks' && Array.isArray(results)) {
					results.forEach((track) => console.log(formatTrack(track)))
				}
			}
		} catch (error) {
			handleError(error as Error)
		}
	}
)

// Database commands
const dbCommands: [string, string, () => Promise<void>][] = [
	['export', 'Export database', async () => console.log(await r5.db.export())],
	[
		'reset',
		'Reset database',
		async () => {
			await r5.db.reset()
			console.log('Database reset successfully')
		}
	],
	[
		'migrate',
		'Run database migrations',
		async () => {
			await r5.db.migrate()
			console.log('Database migrated successfully')
		}
	]
]

cli.command('db <command>', 'Database operations', (yargs) => {
	dbCommands.forEach(([cmd, desc, handler]) => {
		yargs.command(cmd, desc, {}, async () => {
			try {
				await handler()
			} catch (error) {
				handleError(error as Error, 4)
			}
		})
	})
	return yargs.demandCommand(1, 'You need to specify a db command')
})

// Download command
cli.command(
	'download <slug>',
	'Download tracks from a channel',
	(yargs) =>
		yargs
			.positional('slug', {describe: 'Channel slug', type: 'string', demandOption: true})
			.option('output', {
				alias: 'o',
				describe: 'Output directory',
				type: 'string',
				default: '.'
			})
			.option('concurrency', {
				describe: 'Number of concurrent downloads',
				type: 'number',
				default: 5
			})
			.option('dry-run', dryRunOpt)
			.option('premium', {
				describe: 'Use premium YouTube Music (requires --po-token)',
				type: 'boolean',
				default: false
			})
			.option('po-token', {
				describe: 'Premium token for YouTube Music',
				type: 'string'
			})
			.check((argv) => {
				if (argv.premium && !argv['po-token']) {
					throw new Error('--premium requires --po-token')
				}
				return true
			}),
	async (argv) => {
		try {
			if (argv.premium) {
				console.log('Premium mode enabled - using YouTube Music with provided token')
			}

			await downloadChannel(argv.slug, argv.output, {
				r5,
				concurrency: argv.concurrency,
				simulate: argv['dry-run'],
				premium: argv.premium,
				poToken: argv['po-token']
			})
		} catch (error) {
			handleError(error as Error)
		}
	}
)

cli.parse()
