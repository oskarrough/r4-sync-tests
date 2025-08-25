<script>
	import {onMount} from 'svelte'
	import {createBrowserCli} from '$lib/cli-browser'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'
	import {r5} from '$lib/r5'
	import Terminal from '$lib/components/sdk-terminal.svelte'

	let terminalInput = $state('')
	let baseOutput = $state([])
	let commandHistory = $state([])
	let historyIndex = $state(-1)
	let executingCommand = $state(null)
	let inputElement

	// Create simple CLI instance
	const cli = createBrowserCli((type, text, data) => {
		baseOutput.push({
			type,
			text,
			timestamp: new Date(),
			data,
			showData: !!data
		})
	})

	let commandValidation = $derived.by(() => {
		if (!terminalInput.trim()) return null
		if (terminalInput.startsWith('/search')) {
			return {error: 'Did you mean "search tracks ..." or "search channels ..."?'}
		}
		// With simple CLI, validation happens during parsing
		return {valid: true}
	})

	let terminalOutput = $derived([
		...baseOutput,
		...(executingCommand
			? [
					{
						type: 'loading',
						text: '⟳ executing...',
						timestamp: new Date()
					}
				]
			: [])
	])

	// No longer needed - output is handled by cli

	async function handleCommand(type, text) {
		if (type === 'hint') {
			baseOutput.push({type, text, timestamp: new Date()})
			return
		}
		await executeCommand()
	}

	async function executeCommand() {
		if (!terminalInput.trim()) return

		const command = terminalInput
		const validation = commandValidation

		baseOutput.push({
			type: 'command',
			text: `r5 ${command}`,
			timestamp: new Date()
		})

		commandHistory.unshift(command)
		if (commandHistory.length > 100) commandHistory.pop()

		terminalInput = ''
		historyIndex = -1

		if (validation?.error) {
			baseOutput.push({
				type: 'hint',
				text: validation.error,
				timestamp: new Date()
			})
			return
		}

		executingCommand = command

		try {
			const startTime = performance.now()
			console.log(`r5.terminal executing: ${command}`)

			// Use simple CLI to parse and execute
			await cli.parseCommand(command)

			const duration = Math.round(performance.now() - startTime)
			console.log(`r5.terminal completed (${duration}ms)`)

			// Auto-migrate after db reset commands
			if (command.includes('db reset')) {
				await r5.db.migrate()
			}
		} catch (error) {
			baseOutput.push({
				type: 'error',
				text: `✗ ${error.message}`,
				timestamp: new Date()
			})
		} finally {
			executingCommand = null
		}
	}

	onMount(async () => {
		await r5.db.migrate()

		inputElement?.focus()

		// Intercept console.log for batch progress
		const originalLog = console.log
		console.log = (...args) => {
			originalLog(...args)
		}

		// Global keyboard shortcuts
		const handleGlobalKeydown = (e) => {
			// / - focus command input
			if (e.key === '/' && e.target.tagName !== 'INPUT') {
				e.preventDefault()
				inputElement?.focus()
			}
			// Ctrl+K - clear terminal
			else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault()
				terminalOutput = []
			}
			// Escape - blur input
			else if (e.key === 'Escape' && document.activeElement === inputElement) {
				inputElement?.blur()
			}
		}

		document.addEventListener('keydown', handleGlobalKeydown)

		return () => {
			console.log = originalLog
			document.removeEventListener('keydown', handleGlobalKeydown)
		}
	})
</script>

<svelte:head>
	<title>CLI - R5</title>
</svelte:head>

<article class="sdk">
	<header>
		<h1>r5.exe</h1>
	</header>

	<main>
		<Terminal
			bind:terminalInput
			{terminalOutput}
			bind:commandHistory
			bind:historyIndex
			bind:inputElement
			onCommand={handleCommand}
			getCompletions={cli.getCompletions}
		/>
	</main>
	<footer>
		<p>tip: keep the browser console open as well</p>
		<p>
			tip2: the real terminal cli is better than this... (kinda) available via the <a
				href="https://github.com/radio4000/r4-sync-tests"
				rel="noreferrer">repo</a
			>
		</p>
	</footer>
	<section class="repl">
		<PgliteRepl />
	</section>
</article>

<style>
	.sdk {
		display: flex;
		flex-direction: column;
	}

	.sdk header {
		padding: 0.5rem;
		background: var(--gray-2);
		border-bottom: 1px solid var(--gray-4);
		display: flex;
		justify-content: space-between;
	}

	.sdk main {
		flex: 1;
		padding: 0.5rem;
		font-family: var(--monospace);
	}

	.sdk footer {
		margin: 0 0.5rem;
	}

	.repl {
		margin: 0.5rem;
	}
</style>
