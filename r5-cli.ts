#!/usr/bin/env bun

/**
 * Bun CLI for R5 API
 * Usage: `bun r5-cli.ts help`
 */

import {parseCommand} from './src/lib/cli-translator.js'
import {migrateDb} from './src/lib/db.js'

async function main() {
	let args = process.argv.slice(2)

	if (args.length === 0) {
		console.log('Usage: bun r5-cli.ts help')
		process.exit(1)
	}

	// Check for --verbose flag
	const verbose = args.includes('--verbose')
	args = args.filter((arg) => arg !== '--verbose')

	// Initialize database once at startup (unless it's a db command)
	const command = ['r5', ...args].join(' ')
	if (!command.includes('db migrate')) {
		await migrateDb()
	}

	console.log(`> ${command}`)

	try {
		const parsed = parseCommand(command)

		if ('error' in parsed) {
			console.error('Error:', parsed.error)
			process.exit(1)
		}

		console.debug('parsed:', parsed.fn.name, parsed.args.length ? parsed.args : '')
		// process.exit(0)
		// return

		const startTime = performance.now()
		const result = await parsed.fn(...parsed.args)
		const duration = Math.round(performance.now() - startTime)

		// Check if output is piped/redirected or interactive
		const isInteractive = process.stdout.isTTY && !verbose
		const maxItems = isInteractive ? 10 : Infinity

		if (typeof result === 'string') {
			console.log(result)
		} else if (Array.isArray(result)) {
			console.log(`Found ${result.length} items (${duration}ms)`)

			// Truncate large arrays in interactive mode
			if (isInteractive && result.length > maxItems) {
				const truncated = result.slice(0, maxItems)
				console.log(JSON.stringify(truncated, null, 2))
				console.log(
					`... and ${result.length - maxItems} more items (use --verbose or pipe output to see all)`
				)
			} else {
				console.log(JSON.stringify(result, null, 2))
			}
		} else {
			console.log(`Operation completed (${duration}ms)`)
			console.log(JSON.stringify(result, null, 2))
		}
	} catch (error) {
		console.error('✗', error.message)
		process.exit(1)
	}
}

main()
