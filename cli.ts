#!/usr/bin/env node

import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import {r5} from './src/lib/r5/index.js'
import {downloadChannel} from './src/lib/r5/download.js'

// Shared options
const sourceOpt = {
	choices: ['local', 'r4', 'v1'] as const,
	describe: 'Data source: local (your db), r4 (radio4000.com), v1 (legacy)'
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
	.help('help')
	.alias('help', 'h')
	.usage(
		`Radio4000 R5 - Local-First Music Player

Usage:
  $0 search <query> [--channels|--tracks] [--json]
  $0 pull <slug> [--dry-run]
  $0 channels list [slug] [--source=<src>] [--limit=<n>] [--json]
  $0 channels pull [slug] [--dry-run]
  $0 tracks list [slug] [--source=<src>] [--limit=<n>] [--json]
  $0 tracks pull <slug> [--dry-run]
  $0 download <slug> [--output=<dir>] [--concurrency=<n>] [--dry-run]
  $0 db (export|reset|migrate)
  $0 -h | --help
  $0 --version`
	)
	.example('$0 search ko002', 'Search everything for "ko002"')
	.example('$0 search "#am" --tracks', 'Search only tracks for "#am"')
	.example('$0 search brazil -c', 'Search channels for "brazil"')
	.example('$0 search "@ko002 dance"', 'Search "dance" in ko002\'s channel')
	.example('$0 tracks list ko002 --limit 5', 'List 5 tracks from channel')
	.example('$0 channels list --json | jq ".[].slug"', 'Get all channel slugs')
	.recommendCommands()
	.strictCommands()
	.demandCommand(1, 'You need at least one command')
	.strict()
	.parserConfiguration({
		'short-option-groups': true,
		'populate--': true,
		'halt-at-non-option': false
	})
	.wrap(Math.min(100, process.stdout.columns || 80))

// Channels commands
cli.command('channels <command>', 'Manage channels', (yargs) => {
	return yargs
		.command(
			'list [slug]',
			'List channels',
			(yargs) =>
				yargs
					.positional('slug', {describe: 'Channel slug', type: 'string'})
					.options({source: sourceOpt, limit: limitOpt, json: jsonOpt})
					.group(['source', 'limit', 'json'], 'Options:'),
			async (argv) => {
				try {
					if (!argv.source) {
						throw new Error(`Please specify --source (local, r4, or v1)

  --source local  Query your local database
  --source r4     Query radio4000.com directly  
  --source v1     Query legacy firebase data

Hint: To sync data locally first, use: r5 pull ${argv.slug || '[slug]'}`)
					}
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
					.options({source: sourceOpt, limit: limitOpt, json: jsonOpt})
					.group(['source', 'limit', 'json'], 'Options:'),
			async (argv) => {
				try {
					if (!argv.source) {
						throw new Error(`Please specify --source (local, r4, or v1)

  --source local  Query your local database
  --source r4     Query radio4000.com directly  
  --source v1     Query legacy firebase data

Hint: To sync data locally first, use: r5 pull ${argv.slug || '[slug]'}`)
					}
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

// Search command with optional filters
cli.command(
	'search <query>',
	'Search channels and tracks',
	(yargs) =>
		yargs
			.positional('query', {describe: 'Search query', type: 'string'})
			.option('channels', {
				alias: 'c',
				type: 'boolean',
				describe: 'Search only channels'
			})
			.option('tracks', {
				alias: 't',
				type: 'boolean',
				describe: 'Search only tracks'
			})
			.option('json', jsonOpt)
			.group(['channels', 'tracks', 'json'], 'Options:')
			.check((argv) => {
				if (argv.channels && argv.tracks) {
					throw new Error('Cannot specify both --channels and --tracks')
				}
				return true
			}),
	async (argv) => {
		try {
			const query = argv.query.trim()
			let results

			if (argv.channels) {
				results = await r5.search.channels(query)
				if (argv.json) {
					console.log(JSON.stringify(results, null, 2))
				} else {
					results.forEach((channel) => console.log(formatChannel(channel)))
				}
			} else if (argv.tracks) {
				results = await r5.search.tracks(query)
				if (argv.json) {
					console.log(JSON.stringify(results, null, 2))
				} else {
					results.forEach((track) => console.log(formatTrack(track)))
				}
			} else {
				// Search everything
				results = await r5.search.all(query)
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
			.group(['output', 'concurrency', 'dry-run'], 'Download Options:')
			.group(['premium', 'po-token'], 'Premium Options:')
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
