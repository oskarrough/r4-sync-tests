<script>
	import {onMount} from 'svelte'
	import {parseCommand} from '$lib/cli-translator'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'
	import {r5} from '$lib/experimental-api'
	import SourceStatus from '$lib/components/sdk-source-status.svelte'
	import BatchProgress from '$lib/components/sdk-batch-progress.svelte'
	import Terminal from '$lib/components/sdk-terminal.svelte'
	import ActivityMonitor from '$lib/components/sdk-activity-monitor.svelte'

	let terminalInput = $state('')
	let terminalOutput = $state([])
	let commandHistory = $state([])
	let historyIndex = $state(-1)
	let inputElement

	// Source status state
	let sourceStatus = $state({
		local: {connected: true, channels: 0, tracks: 0, lastSync: null},
		r4: {connected: false, channels: 0, tracks: 0, lastSync: null},
		v1: {connected: false, channels: 0, tracks: 0, lastSync: null}
	})

	// Batch progress state
	let batchProgress = $state({
		active: false,
		operation: '',
		currentBatch: 0,
		totalBatches: 0,
		totalItems: 0,
		completedItems: 0,
		errors: 0
	})

	// Activity monitor
	let activityLog = $state([])

	function logActivity(operation, duration = null, source = 'local') {
		const entry = {
			timestamp: new Date(),
			operation,
			duration,
			source
		}
		activityLog.unshift(entry)
	}

	async function updateSourceStatus() {
		try {
			const localChannels = await r5.channels()
			sourceStatus.local.channels = localChannels.length
			sourceStatus.local.tracks = (await r5.tracks()).length
			sourceStatus.local.connected = true

			// Count R4 channels (those WITHOUT firebase_id - they're v2/modern channels)
			const r4Channels = localChannels.filter((c) => !c.firebase_id)
			sourceStatus.r4.channels = r4Channels.length

			// Count V1 channels (those WITH firebase_id - they're legacy channels)
			const v1Channels = localChannels.filter((c) => c.firebase_id)
			sourceStatus.v1.channels = v1Channels.length
		} catch (err) {
			console.error('Failed to update local status:', err)
			sourceStatus.local.connected = false
		}

		try {
			// Test R4 connection
			await fetch('https://radio4000.com', {mode: 'no-cors'})
			sourceStatus.r4.connected = true
		} catch {
			sourceStatus.r4.connected = false
		}

		// V1 is always considered connected if local has data
		sourceStatus.v1.connected = sourceStatus.local.connected
	}

	function parseBatcherLog(message) {
		if (message.startsWith('batcher: processing')) {
			// "batcher: processing 142 items in 3 batches (batchSize: 50, withinBatch: 1)"
			const match = message.match(/processing (\d+) items in (\d+) batches/)
			if (match) {
				batchProgress.active = true
				batchProgress.totalItems = parseInt(match[1])
				batchProgress.totalBatches = parseInt(match[2])
				batchProgress.currentBatch = 0
				batchProgress.completedItems = 0
				batchProgress.errors = 0
				batchProgress.operation = 'processing items'
			}
		} else if (message.startsWith('batcher: batch ')) {
			// "batcher: batch 2/3 - processing 50 items"
			const match = message.match(/batch (\d+)\/(\d+) - processing (\d+) items/)
			if (match) {
				batchProgress.currentBatch = parseInt(match[1])
				const batchItems = parseInt(match[3])
				batchProgress.completedItems = (parseInt(match[1]) - 1) * batchItems

				// Hide visualizer when complete
				if (batchProgress.currentBatch >= batchProgress.totalBatches) {
					setTimeout(() => {
						batchProgress.active = false
					}, 2000)
				}
			}
		}
	}

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

				// Log to activity monitor
				const source = command.includes('r4') ? 'r4' : command.includes('v1') ? 'v1' : 'local'
				logActivity(`r5 ${command}`, duration, source)

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

		await updateSourceStatus()
	}

	async function copyToClipboard(data) {
		try {
			const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
			await navigator.clipboard.writeText(text)
			// Show brief feedback
			const copyNotice = {
				type: 'success',
				text: '✓ copied to clipboard',
				timestamp: new Date()
			}
			terminalOutput.push(copyNotice)
			setTimeout(() => {
				const index = terminalOutput.indexOf(copyNotice)
				if (index > -1) terminalOutput.splice(index, 1)
			}, 2000)
		} catch (err) {
			console.error('Failed to copy:', err)
		}
	}

	onMount(async () => {
		await r5.db.migrate()

		inputElement?.focus()

		updateSourceStatus()

		// Intercept console.log for batch progress
		const originalLog = console.log
		console.log = (...args) => {
			if (args[0] && typeof args[0] === 'string' && args[0].startsWith('batcher:')) {
				parseBatcherLog(args[0])
			}
			originalLog(...args)
		}

		// Update status every 30 seconds
		//const interval = setInterval(updateSourceStatus, 1000)

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
		<SourceStatus {sourceStatus} />
	</header>

	<main>
		<BatchProgress {batchProgress} />

		<Terminal
			bind:terminalInput
			bind:terminalOutput
			bind:commandHistory
			bind:historyIndex
			bind:inputElement
			onCommand={handleCommand}
			onCopy={copyToClipboard}
		/>

		<ActivityMonitor {activityLog} />
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
