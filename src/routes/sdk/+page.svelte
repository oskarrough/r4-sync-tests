<script>
	import {onMount} from 'svelte'
	import {parseCommand, getCompletions} from '$lib/cli-translator'
	import {r5} from '$lib/experimental-api'

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
	let syncInProgress = $state({
		local: false,
		r4: false,
		v1: false
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
			// Update local status
			const localChannels = await r5.db.pg.sql`select count(*) from channels`
			const localTracks = await r5.db.pg.sql`select count(*) from tracks`
			sourceStatus.local.channels = parseInt(localChannels.rows[0].count)
			sourceStatus.local.tracks = parseInt(localTracks.rows[0].count)
			sourceStatus.local.connected = true
		} catch {
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

	async function syncSource(source) {
		if (syncInProgress[source]) return

		syncInProgress[source] = true

		try {
			switch (source) {
				case 'r4':
					await r5.channels.pull()
					break
				case 'v1':
					await r5.channels.v1()
					break
			}
		} finally {
			syncInProgress[source] = false
			await updateSourceStatus()
		}
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

	onMount(() => {
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
		const interval = setInterval(updateSourceStatus, 30000)

		return () => {
			clearInterval(interval)
			console.log = originalLog
		}
	})

	function handleFormSubmit(event) {
		event.preventDefault()
		handleCommand()
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
				terminalOutput.push({
					type: 'success',
					text: `✓ ${Array.isArray(result) ? result.length : 1} results (${duration}ms)`,
					timestamp: new Date(),
					data: result,
					showData: true
				})
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

		// Auto-scroll terminal
		await tick()
		scrollTerminal()
	}

	function handleKeydown(event) {
		if (event.key === 'Enter') {
			handleCommand()
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			if (historyIndex < commandHistory.length - 1) {
				historyIndex++
				terminalInput = commandHistory[historyIndex] || ''
			}
		} else if (event.key === 'ArrowDown') {
			event.preventDefault()
			if (historyIndex > 0) {
				historyIndex--
				terminalInput = commandHistory[historyIndex] || ''
			} else if (historyIndex === 0) {
				historyIndex = -1
				terminalInput = ''
			}
		} else if (event.key === 'Tab') {
			event.preventDefault()
			const completions = getCompletions(`r5 ${terminalInput}`)
			if (completions.length === 1) {
				// Remove 'r5 ' prefix from completion
				const completion = completions[0].startsWith('r5 ')
					? completions[0].slice(3)
					: completions[0]
				terminalInput = completion + ' '
			} else if (completions.length > 1) {
				terminalOutput.push({
					type: 'hint',
					text: completions.join(', '),
					timestamp: new Date()
				})
				scrollTerminal()
			}
		}
	}

	function scrollTerminal() {
		setTimeout(() => {
			const terminal = document.querySelector('.terminal-output')
			if (terminal) {
				terminal.scrollTop = terminal.scrollHeight
			}
		}, 0)
	}

	async function tick() {
		return new Promise((resolve) => setTimeout(resolve, 0))
	}
</script>

<svelte:head>
	<title>R5 SDK Explorer</title>
</svelte:head>

<article class="sdk">
	<header>
		<h1>r5 sdk explorer</h1>

		<section class="sources">
			<div>
				<strong>LOCAL</strong>
				<div class="lamp local {sourceStatus.local.connected ? 'connected' : 'disconnected'}"></div>
				<small>{sourceStatus.local.channels} ch, {sourceStatus.local.tracks} tr</small>
			</div>

			<div>
				<strong>R4</strong>
				<div class="lamp r4 {sourceStatus.r4.connected ? 'connected' : 'disconnected'}"></div>
				<small>ready</small>
				<button onclick={() => syncSource('r4')} disabled={syncInProgress.r4}>
					{syncInProgress.r4 ? '⟳' : 'PULL'}
				</button>
			</div>

			<div>
				<strong>V1</strong>
				<div class="lamp v1 {sourceStatus.v1.connected ? 'connected' : 'disconnected'}"></div>
				<small>{sourceStatus.local.channels} ch</small>
				<button onclick={() => syncSource('v1')} disabled={syncInProgress.v1}>
					{syncInProgress.v1 ? '⟳' : 'PULL'}
				</button>
			</div>
		</section>
	</header>

	<main>
		{#if batchProgress.active}
			<section class="batch">
				<p><strong>{batchProgress.operation}</strong></p>
				<p>
					batch {batchProgress.currentBatch}/{batchProgress.totalBatches}
					<progress value={batchProgress.currentBatch} max={batchProgress.totalBatches}></progress>
					{Math.round((batchProgress.currentBatch / batchProgress.totalBatches) * 100)}%
				</p>
				<p>▪▪▪●●●●●○○ ({batchProgress.currentBatch}/{batchProgress.totalBatches} batches)</p>
				<p>items: {batchProgress.completedItems}/{batchProgress.totalItems}</p>
				{#if batchProgress.errors > 0}
					<p><em>errors: {batchProgress.errors}</em></p>
				{/if}
			</section>
		{/if}

		<section class="terminal">
			<div class="output">
				{#each terminalOutput as entry, i (i)}
					<div class={entry.type}>
						{entry.text}
						{#if entry.showData && entry.data}
							<div class="data">
								{#if Array.isArray(entry.data)}
									{#each entry.data.slice(0, 3) as item, j (j)}
										<div>
											{#if item.name || item.title}
												<strong>{item.name || item.title}</strong>
											{/if}
											{#if item.slug}
												<small>({item.slug})</small>
											{/if}
											{#if item.url}
												<small>{item.url}</small>
											{/if}
										</div>
									{/each}
									{#if entry.data.length > 3}
										<small>... and {entry.data.length - 3} more</small>
									{/if}
								{:else if typeof entry.data === 'object'}
									<div>
										{#if entry.data.name}
											<strong>{entry.data.name}</strong>
										{/if}
										{#if entry.data.slug}
											<small>({entry.data.slug})</small>
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<form class="input" onsubmit={handleFormSubmit}>
				<label>
					<strong>r5</strong>
					<input
						bind:this={inputElement}
						bind:value={terminalInput}
						onkeydown={handleKeydown}
						placeholder="channels"
						autocomplete="off"
						spellcheck="false"
					/>
				</label>
			</form>
		</section>

		{#if activityLog.length > 0}
			<section class="activity">
				<h3>activity</h3>
				<ul>
					{#each activityLog as entry, i (i)}
						<li class={entry.source}>
							<small>{entry.timestamp.toLocaleTimeString()}</small>
							<span>{entry.operation}</span>
							{#if entry.duration}
								<em>{entry.duration}ms</em>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</main>
</article>

<style>
	.sdk {
		font-family: var(--monospace);
		background: var(--gray-1);
		color: var(--gray-12);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.sdk header {
		padding: 1rem;
		background: var(--gray-2);
		border-bottom: 1px solid var(--gray-4);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.sdk main {
		flex: 1;
		padding: 1rem;
	}

	/* Sources status panel */
	.sources {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.85rem;
		min-width: 200px;
	}

	.sources > div {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sources strong {
		width: 3rem;
	}

	.sources button {
		background: var(--gray-3);
		border: 1px solid var(--gray-6);
		padding: 0.2rem;
		font-size: 0.75rem;
		cursor: pointer;
		min-width: 2.5rem;
	}

	.sources button:hover:not(:disabled) {
		background: var(--gray-4);
	}

	.sources button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		animation: spin 1s linear infinite;
	}

	/* Batch progress */
	.batch {
		background: var(--gray-2);
		border: 1px solid var(--gray-4);
		padding: 0.5rem;
		margin-bottom: 1rem;
	}

	.batch progress {
		width: 100px;
		height: 0.5rem;
	}

	/* Terminal */
	.terminal {
		background: var(--gray-2);
		border: 1px solid var(--gray-4);
		height: 500px;
		display: flex;
		flex-direction: column;
	}

	.terminal .output {
		flex: 1;
		padding: 1rem;
		overflow-y: auto;
	}

	.terminal .output > div {
		margin-bottom: 0.2rem;
		white-space: pre-wrap;
	}

	.terminal .success {
		color: var(--color-green);
	}

	.terminal .error {
		color: var(--color-red);
	}

	.terminal .loading {
		color: var(--color-yellow);
	}

	.terminal .hint {
		color: var(--gray-8);
	}

	.terminal .data {
		margin-left: 1rem;
		opacity: 0.8;
	}

	.terminal .data > div {
		border-left: 2px solid var(--gray-6);
		padding-left: 0.5rem;
		margin-bottom: 0.2rem;
	}

	.terminal .input {
		border-top: 1px solid var(--gray-4);
		padding: 0.5rem 1rem;
		background: var(--gray-1);
	}

	.terminal label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.terminal input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
	}

	/* Activity monitor */
	.activity ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.activity li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.2rem 0;
	}

	.activity li span {
		flex: 1;
	}

	.activity li.r4 span {
		color: var(--color-lavender);
	}

	.activity li.v1 span {
		color: var(--color-orange);
	}

	/* Status lamps */
	.lamp {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		box-shadow: 0 0 0.3rem currentColor;
	}

	.lamp.local.connected {
		background: var(--color-green);
		color: var(--color-green);
	}

	.lamp.r4.connected {
		background: var(--color-lavender);
		color: var(--color-lavender);
	}

	.lamp.v1.connected {
		background: var(--color-orange);
		color: var(--color-orange);
	}

	.lamp.disconnected {
		background: var(--gray-6);
		color: var(--gray-6);
		opacity: 0.3;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
