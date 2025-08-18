import {describe, it, expect} from 'vitest'
import {exec} from 'child_process'
import {promisify} from 'util'

const execAsync = promisify(exec)
const CLI = 'bun ./cli.ts'

describe('CLI smoke tests', () => {
	it('should show help', async () => {
		const {stdout} = await execAsync(`${CLI} help`)
		expect(stdout).toContain('Usage:')
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
