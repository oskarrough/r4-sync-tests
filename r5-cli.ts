#!/usr/bin/env bun

/**
 * Node.js CLI for R5 experimental API
 * Usage: bun r5-cli.ts channels oskar
 * Usage: bun r5-cli.ts tracks local
 * Usage: bun r5-cli.ts search jazz
 */

import {parseCommand} from './src/lib/cli-translator.js'
import {migrateDb} from './src/lib/db.js'

// Main CLI execution
async function main() {
	const args = process.argv.slice(2)

	if (args.length === 0) {
		console.log('Usage: bun r5-cli.ts <command> [args...]')
		console.log('Examples:')
		console.log('  bun r5-cli.ts channels')
		console.log('  bun r5-cli.ts channels oskar')
		console.log('  bun r5-cli.ts tracks local')
		console.log('  bun r5-cli.ts db migrate')
		process.exit(1)
	}

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

		console.log('parsed command:', parsed)
		// process.exit(0)
		// return

		const startTime = performance.now()
		const result = await parsed.fn(...parsed.args)
		const duration = Math.round(performance.now() - startTime)

		if (typeof result === 'string') {
			console.log(result)
		} else if (Array.isArray(result)) {
			console.log(`✓ ${result.length} results (${duration}ms)`)
			console.log(JSON.stringify(result, null, 2))
		} else {
			console.log(`✓ result (${duration}ms)`)
			console.log(JSON.stringify(result, null, 2))
		}
	} catch (error) {
		console.error('✗', error.message)
		process.exit(1)
	}
}

main()
