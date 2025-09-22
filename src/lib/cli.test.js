import {exec} from 'node:child_process'
import {promisify} from 'node:util'
import {describe, expect, it} from 'vitest'

const execAsync = promisify(exec)
const CLI = 'bun src/lib/cli.ts'

describe('CLI smoke tests', () => {
	it('should show help', async () => {
		const {stdout} = await execAsync(`${CLI} help`)
		expect(stdout).toContain('Commands:')
	})

	it('should handle basic commands without crashing', async () => {
		await execAsync(`${CLI} db migrate`)
		const {stdout} = await execAsync(`${CLI} channels list --limit 1 --source r4 --json`)
		expect(() => JSON.parse(stdout)).not.toThrow()
	})

	it('should validate required arguments', async () => {
		try {
			await execAsync(`${CLI} search`)
			expect.fail('Should require query')
		} catch (error) {
			expect(error.stderr).toContain('Not enough non-option arguments')
		}
	})
})
