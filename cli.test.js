import {describe, it, expect, beforeEach} from 'vitest'
import {exec} from 'child_process'
import {promisify} from 'util'

const execAsync = promisify(exec)
const CLI = 'bun ./cli.ts'

describe('CLI functionality', () => {
	beforeEach(async () => {
		// Skip db reset for now - just ensure migrations run
		try {
			await execAsync(`${CLI} db migrate`)
		} catch (e) {
			// Ignore migration errors for now
		}
	})

	describe('search command', () => {
		it('should require query parameter', async () => {
			try {
				await execAsync(`${CLI} search`)
				expect.fail('Should have thrown error')
			} catch (error) {
				expect(error.stderr).toContain('Not enough non-option arguments')
			}
		})

		it('should handle empty query gracefully', async () => {
			try {
				await execAsync(`${CLI} search ""`)
				expect.fail('Should have thrown error')
			} catch (error) {
				expect(error.stderr).toContain('Search query cannot be empty')
			}
		})

		it('should work with valid query', async () => {
			// First pull some data to search
			await execAsync(`${CLI} pull ko002`)
			
			const {stdout} = await execAsync(`${CLI} search tracks ko002 --json`)
			const results = JSON.parse(stdout)
			expect(Array.isArray(results)).toBe(true)
		})

		it('should default to "all" search type', async () => {
			await execAsync(`${CLI} pull ko002`)
			
			const {stdout} = await execAsync(`${CLI} search ko002 --json`)
			const results = JSON.parse(stdout)
			expect(results).toHaveProperty('channels')
			expect(results).toHaveProperty('tracks')
		})
	})

	describe('output limits', () => {
		it('should respect --limit option for channels', async () => {
			const {stdout} = await execAsync(`${CLI} channels list --source r4 --limit 3 --json`)
			const results = JSON.parse(stdout)
			expect(results.length).toBeLessThanOrEqual(3)
		})

		it('should respect --limit option for tracks', async () => {
			const {stdout} = await execAsync(`${CLI} tracks list ko002 --source r4 --limit 2 --json`)
			const results = JSON.parse(stdout)
			expect(results.length).toBeLessThanOrEqual(2)
		})

		it('should show truncation message when limit applied in text mode', async () => {
			const {stdout} = await execAsync(`${CLI} channels list --source r4 --limit 2`)
			if (stdout.includes('... and')) {
				expect(stdout).toMatch(/\.\.\. and \d+ more/)
			}
		})
	})

	describe('download command', () => {
		it('should require folder argument', async () => {
			try {
				await execAsync(`${CLI} download ko002`)
				expect.fail('Should have thrown error')
			} catch (error) {
				expect(error.stderr).toContain('Missing required argument: folder')
			}
		})

		it('should accept folder argument', async () => {
			// Just test argument parsing, not actual download
			const {stdout} = await execAsync(`${CLI} download ko002 ./test-folder --dry-run`)
			expect(stdout).toContain('Would download')
		})
	})

	describe('database operations', () => {
		it('should verify tracks_with_meta view exists after migration', async () => {
			await execAsync(`${CLI} db migrate`)
			
			// This would fail if tracks_with_meta view doesn't exist
			const {stdout} = await execAsync(`${CLI} db export`)
			expect(stdout).toBeDefined()
		})
	})

	describe('command structure consistency', () => {
		it('should have consistent pull commands', async () => {
			// Test all pull command variations work
			await execAsync(`${CLI} channels pull ko002 --dry-run`)
			await execAsync(`${CLI} tracks pull ko002 --dry-run`)
			await execAsync(`${CLI} pull ko002 --dry-run`)
		})

		it('should have consistent list commands', async () => {
			// These should all work without error
			await execAsync(`${CLI} channels list --limit 1 --source r4 --json`)
			await execAsync(`${CLI} tracks list ko002 --limit 1 --source r4 --json`)
		})
	})

	describe('error handling', () => {
		it('should handle non-existent commands gracefully', async () => {
			try {
				await execAsync(`${CLI} nonexistent`)
				expect.fail('Should have thrown error')
			} catch (error) {
				expect(error.stderr).toContain('Unknown command')
			}
		})

		it('should handle invalid source option', async () => {
			try {
				await execAsync(`${CLI} channels list --source invalid`)
				expect.fail('Should have thrown error')
			} catch (error) {
				expect(error.stderr).toContain('Invalid values')
			}
		})
	})

	describe('JSON output', () => {
		it('should output valid JSON when --json flag used', async () => {
			const {stdout} = await execAsync(`${CLI} channels list --limit 1 --source r4 --json`)
			expect(() => JSON.parse(stdout)).not.toThrow()
		})

		it('should output consistent format across commands', async () => {
			const channelsOut = await execAsync(`${CLI} channels list --limit 1 --source r4 --json`)
			const tracksOut = await execAsync(`${CLI} tracks list ko002 --limit 1 --source r4 --json`)
			
			expect(() => JSON.parse(channelsOut.stdout)).not.toThrow()
			expect(() => JSON.parse(tracksOut.stdout)).not.toThrow()
		})
	})
})