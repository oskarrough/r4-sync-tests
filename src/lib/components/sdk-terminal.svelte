<script>
	import {getCompletions} from '$lib/cli-translator'

	let {
		terminalInput = $bindable(),
		terminalOutput = $bindable(),
		commandHistory = $bindable(),
		historyIndex = $bindable(),
		inputElement = $bindable(),
		onCommand,
		onCopy
	} = $props()

	function handleFormSubmit(event) {
		event.preventDefault()
		onCommand()
	}

	function handleKeydown(event) {
		if (event.key === 'Enter') {
			onCommand()
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
				const completion = completions[0].startsWith('r5 ')
					? completions[0].slice(3)
					: completions[0]
				terminalInput = completion
			} else if (completions.length > 1) {
				const displayCompletions = completions.map((c) => c.replace('r5 ', ''))
				terminalOutput.push({
					type: 'hint',
					text: displayCompletions.join('  '),
					timestamp: new Date()
				})
				setTimeout(scrollTerminal, 0)
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
</script>

<section class="terminal">
	<div class="output terminal-output">
		{#each terminalOutput as entry, i (i)}
			<div class={entry.type}>
				<span>{entry.text}</span>
				{#if entry.showData && entry.data}
					<button class="copy" onclick={() => onCopy(entry.data)} title="copy result">📋</button>
				{/if}
				{#if entry.showData && entry.data}
					<div class="data">
						{#if Array.isArray(entry.data)}
							<div>
								{entry.data
									.slice(0, 3)
									.map((item) => (item.slug ? `@${item.slug}` : item.title || item.name))
									.join(', ')}
								{#if entry.data.length > 3}
									and {entry.data.length - 3} more{/if}
							</div>
						{:else if typeof entry.data === 'object'}
							<div>
								{#if entry.data.name}
									<strong>{entry.data.name || entry.data.title}</strong>
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

<style>
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
		position: relative;
	}

	.terminal .copy {
		position: absolute;
		right: 0.5rem;
		top: 0;
		background: var(--gray-3);
		border: 1px solid var(--gray-5);
		padding: 0.2rem 0.3rem;
		cursor: pointer;
		font-size: 0.8rem;
		opacity: 0.6;
		transition: opacity 0.2s;
	}

	.terminal .copy:hover {
		opacity: 1;
		background: var(--gray-4);
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
</style>
