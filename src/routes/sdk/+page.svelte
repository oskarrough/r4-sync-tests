<script>
	import {onMount} from 'svelte'
	import {parseCommand} from '$lib/cli-translator'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'
	import {r5} from '$lib/experimental-api'
	import Terminal from '$lib/components/sdk-terminal.svelte'

	let terminalInput = $state('')
	let terminalOutput = $state([])
	let commandHistory = $state([])
	let historyIndex = $state(-1)
	let inputElement

	async function handleCommand() {
		if (!terminalInput.trim()) return

		// Add command to output
		terminalOutput.push({
			type: 'command',
			text: `r5 ${terminalInput}`,
			timestamp: new Date()
		})

		// Add to history
		commandHistory.unshift(terminalInput)
		if (commandHistory.length > 100) commandHistory.pop()

		// Clear input and reset history
		const command = terminalInput
		terminalInput = ''
		historyIndex = -1

		// Check for common mistake: /search instead of search.
		if (command.startsWith('/search')) {
			terminalOutput.push({
				type: 'hint',
				text: 'Did you mean "search.tracks ..." or "search.channels ..."?',
				timestamp: new Date()
			})
			return
		}

		// Parse and execute command
		const parsed = parseCommand(`r5 ${command}`)

		if (parsed.error) {
			terminalOutput.push({
				type: 'error',
				text: parsed.error,
				timestamp: new Date()
			})
		} else {
			// Show loading
			const loadingEntry = {
				type: 'loading',
				text: '⟳ executing...',
				timestamp: new Date()
			}
			terminalOutput.push(loadingEntry)

			try {
				const startTime = performance.now()

				// Console logging for introspection
				console.log(`[R5 SDK] Executing: ${command}`)
				console.log(`[R5 SDK] Function:`, parsed.fn.name || parsed.fn)
				console.log(`[R5 SDK] Args:`, parsed.args)

				const result = await parsed.fn(...parsed.args)
				const duration = Math.round(performance.now() - startTime)

				console.log(`[R5 SDK] Result (${duration}ms):`, result)

				// Remove loading entry
				terminalOutput.splice(terminalOutput.indexOf(loadingEntry), 1)

				// Add result
				if (typeof result === 'string') {
					terminalOutput.push({
						type: 'success',
						text: result,
						timestamp: new Date()
					})
				} else {
					terminalOutput.push({
						type: 'success',
						text: `✓ ${Array.isArray(result) ? result.length : 1} results (${duration}ms)`,
						timestamp: new Date(),
						data: result,
						showData: true
					})
				}

				// Refresh status if db was reset
				if (
					command.includes('db.reset') ||
					command.includes('db reset') ||
					command.includes('drop_tables')
				) {
					await r5.db.migrate()
				}
			} catch (error) {
				// Remove loading entry
				terminalOutput.splice(terminalOutput.indexOf(loadingEntry), 1)

				terminalOutput.push({
					type: 'error',
					text: `✗ ${error.message}`,
					timestamp: new Date()
				})
			}
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
	<title>R5 SDK Explorer</title>
</svelte:head>

<article class="sdk">
	<header>
		<h1>r5.exe</h1>
	</header>

	<main>
		<Terminal
			bind:terminalInput
			bind:terminalOutput
			bind:commandHistory
			bind:historyIndex
			bind:inputElement
			onCommand={handleCommand}
		/>
	</main>
	<section class="repl">
		<PgliteRepl />
	</section>
	<footer>
		<p>tip: keep the browser console open</p>
	</footer>
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
