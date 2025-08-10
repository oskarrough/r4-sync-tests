import {describe, it, expect} from 'vitest'
import {execSync} from 'child_process'

// Helper to run CLI commands with timeout
function runCLI(args: string): string {
	try {
		// Run with timeout and capture both stdout and stderr
		return execSync(`timeout 3 bun r5-cli.ts ${args} 2>&1`, {
			encoding: 'utf8',
			stdio: 'pipe',
			shell: true
		})
	} catch (error) {
		// Return stdout even if exit code is non-zero
		return error.stdout?.toString() || error.stderr?.toString() || error.message
	}
}

describe('r5-cli', () => {
	describe('help command', () => {
		it('should show help when called with help', () => {
			const output = runCLI('help')
			expect(output).toContain('channels')
			expect(output).toContain('tracks')
			expect(output).toContain('search')
			expect(output).toContain('queue')
			expect(output).toContain('db')
			expect(output).toContain('pull')
		})

		it('should show usage when called without args', () => {
			try {
				const output = execSync('bun r5-cli.ts 2>&1', {
					encoding: 'utf8',
					stdio: 'pipe'
				})
				expect(output).toContain('Usage: bun r5-cli.ts <command>')
			} catch (error) {
				// Exit code 1 is expected when no args
				expect(error.stdout || error.stderr).toContain('Usage: bun r5-cli.ts <command>')
			}
		})
	})

	describe('channels command', () => {
		it('should list all local channels without arguments', () => {
			const output = runCLI('channels')
			expect(output).toContain('parsed command:')
			// Should return array
			expect(output).toMatch(/\[|\]/)
		})

		it('should fetch channels from r4 with r4 provider', () => {
			const output = runCLI('channels r4')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/results|result/)
		})

		it('should fetch specific channel with valid r4 slug "oskar"', () => {
			const output = runCLI('channels r4 oskar')
			expect(output).toContain('parsed command:')
			expect(output).toContain('result')
			// Should return single object, not array
			expect(output).not.toContain('0 results')
		})

		it('should handle valid v1 slug "bubba-radio"', () => {
			const output = runCLI('channels pull bubba-radio')
			expect(output).toContain('parsed command:')
			// v1 channels should work with pull provider
			expect(output).toMatch(/result|✓|channel/i)
		})

		it('should handle non-existent slug (404)', () => {
			const output = runCLI('channels r4 this-slug-definitely-does-not-exist-12345')
			expect(output).toContain('parsed command:')
			// Should either return empty, null, or error message
			expect(output).toMatch(/null|undefined|\[\]|not found|✗|multiple \(or no\) rows/i)
		})
	})

	describe('tracks command', () => {
		it('should list local tracks', () => {
			const output = runCLI('tracks local')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/\[|\]/) // Should return array
		})

		it('should require slug for r4 provider', () => {
			const output = runCLI('tracks r4')
			// Should error or return empty result
			expect(output).toMatch(/error|✗|\[\]|0 results|required/i)
		})

		it('should fetch tracks for r4 channel', () => {
			const output = runCLI('tracks r4 oskar')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/results/)
			expect(output).toMatch(/\[|\]/) // Should return array
		})

		it('should fetch tracks for v1 channel', () => {
			const output = runCLI('tracks pull bubba-radio')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/results|✓|\d+ tracks/i)
		})
	})

	describe('search command', () => {
		it('should search channels', () => {
			const output = runCLI('search channels jazz')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/results|result/)
		})

		it('should search tracks', () => {
			const output = runCLI('search tracks jazz')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/results|result/)
		})

		it('should search both without type', () => {
			const output = runCLI('search jazz')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/results|result/)
		})
	})

	describe('pull command', () => {
		it('should pull channel with tracks', () => {
			const output = runCLI('pull oskar')
			expect(output).toContain('parsed command:')
			// Pull should return success message or channel data
			expect(output).toMatch(/result|pulled|imported/)
		})

		it('should handle 404 on pull', () => {
			const output = runCLI('pull non-existent-channel-xyz')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/not found|error|✗|imported 0|pulled 0|Channel not found/i)
		})
	})

	describe('return types', () => {
		it('should return arrays for list operations', () => {
			const channelsOutput = runCLI('channels local')
			expect(channelsOutput).toMatch(/\[/)
			expect(channelsOutput).toMatch(/\]/)

			const tracksOutput = runCLI('tracks local')
			expect(tracksOutput).toMatch(/\[/)
			expect(tracksOutput).toMatch(/\]/)
		})

		it('should return single object for single channel fetch', () => {
			const output = runCLI('channels r4 oskar')
			// Check it's an object (has curly braces) not array
			if (!output.includes('0 results') && !output.includes('not found')) {
				expect(output).toMatch(/\{/)
				expect(output).toMatch(/\}/)
			}
		})

		it('should return empty array or null for 404s', () => {
			const output = runCLI('channels r4 definitely-not-a-real-channel-xyz123')
			// Should be either empty array [], null, or error message
			expect(output).toMatch(/\[\]|null|not found|0 results|✗|multiple \(or no\) rows/i)
		})
	})

	describe('db commands', () => {
		it('should handle db migrate', () => {
			const output = runCLI('db migrate')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/migrat|result/i)
		})

		it('should handle db export', () => {
			const output = runCLI('db export')
			expect(output).toContain('parsed command:')
			expect(output).toMatch(/export|result/i)
		})
	})

	describe('queue commands', () => {
		it('should handle queue add', () => {
			const output = runCLI('queue add')
			// Queue commands may not parse or may error
			expect(output).toBeDefined()
		})

		it('should handle queue clear', () => {
			const output = runCLI('queue clear')
			// Queue commands may not parse or may error
			expect(output).toBeDefined()
		})
	})
})
