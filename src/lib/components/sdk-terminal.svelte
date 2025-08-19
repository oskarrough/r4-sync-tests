<script>
	// Completions now handled by parent component

	let {
		terminalInput = $bindable(),
		terminalOutput,
		commandHistory = $bindable(),
		historyIndex = $bindable(),
		inputElement = $bindable(),
		onCommand,
		getCompletions // completion function passed from parent
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
			if (getCompletions) {
				getCompletions(terminalInput).then((completions) => {
					if (completions.length === 1) {
						terminalInput = completions[0]
					} else if (completions.length > 1) {
						onCommand('hint', completions.join('  '))
						setTimeout(scrollTerminal, 0)
					}
				})
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
	<div class="output terminal-output scroll">
		{#each terminalOutput as entry, i (i)}
			<div class={entry.type}>
				<span>{entry.text}</span>
				{#if entry.showData && entry.data}
					<div class="data">
						{#if Array.isArray(entry.data)}
							<div>
								{entry.data
									.slice(0, 3)
									.map((item) =>
										item.slug ? `@${item.slug}` : item.title || item.name || 'untitled'
									)
									.join(', ')}
								{#if entry.data.length > 3}
									+ {entry.data.length - 3} more{/if}
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
				placeholder="help"
				autocomplete="off"
				spellcheck="false"
			/>
		</label>
	</form>
</section>

<style>
	.terminal {
		border: 1px solid var(--gray-4);
		height: 500px;
		display: flex;
		flex-direction: column;
	}

	.terminal .output {
		flex: 1;
		padding: 0.5rem;
	}

	.terminal .output > div {
		margin-bottom: 0.2rem;
		white-space: pre-wrap;
		position: relative;
	}

	.terminal .success {
		color: light-dark(var(--color-accent), var(--color-accent));
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
		padding: 0.5rem;
		background: var(--gray-3);
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
