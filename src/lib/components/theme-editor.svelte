<script>
	import {appState} from '$lib/app-state.svelte'
	import {applyCustomCssVariables} from '$lib/apply-css-variables'
	import InputRange from '$lib/components/input-range.svelte'
	import InputColor from '$lib/components/input-color.svelte'
	import ThemeToggle from '$lib/components/theme-toggle.svelte'

	const uid = $props.id()

	// Base colors that generate scales
	const baseColors = [
		{
			name: '--accent-base-light',
			label: 'accent (light)',
			description: 'generates accent-1 through accent-12',
			default: '#6d28d9',
			theme: 'light'
		},
		{
			name: '--accent-base-dark',
			label: 'accent (dark)',
			description: 'generates accent-1 through accent-12',
			default: '#b8e68a',
			theme: 'dark'
		},
		{
			name: '--gray-base-light',
			label: 'gray (light)',
			description: 'generates gray-1 through gray-12',
			default: '#988B8B',
			theme: 'light'
		},
		{
			name: '--gray-base-dark',
			label: 'gray (dark)',
			description: 'generates gray-1 through gray-12',
			default: '#988B8B',
			theme: 'dark'
		}
	]

	// Optional overrides
	const overrides = [
		{
			name: '--button-bg-light',
			label: 'button bg (light)',
			description: 'override button background',
			default: '#fff',
			theme: 'light'
		},
		{
			name: '--button-bg-dark',
			label: 'button bg (dark)',
			description: 'override button background',
			default: '#000',
			theme: 'dark'
		},
		{
			name: '--button-color-light',
			label: 'button text (light)',
			description: 'override button text color',
			default: '#000',
			theme: 'light'
		},
		{
			name: '--button-color-dark',
			label: 'button text (dark)',
			description: 'override button text color',
			default: '#fff',
			theme: 'dark'
		}
	]

	const currentTheme = $derived(appState.theme || 'auto')
	const isActiveVariable = (variable) => {
		if (variable.theme === 'both') return true
		if (currentTheme === 'auto') return true
		return variable.theme === currentTheme
	}

	const customVariables = $derived(appState.custom_css_variables || {})
	const getCurrentValue = (variable) => customVariables[variable.name] || variable.default

	let debounceTimer = $state()
	let applyTimer = $state()

	const updateVariable = (name, value) => {
		console.log(name, value)

		// Debounce both CSS application and database persistence
		clearTimeout(applyTimer)
		clearTimeout(debounceTimer)

		applyTimer = setTimeout(() => {
			applyCustomCssVariables({...customVariables, [name]: value.trim()})
		}, 50) // Fast visual feedback

		debounceTimer = setTimeout(() => {
			if (value.trim()) {
				appState.custom_css_variables[name] = value.trim()
			} else {
				delete appState.custom_css_variables[name]
			}
		}, 300) // Slower database persistence
	}
	const resetToDefaults = () => {
		appState.custom_css_variables = {}
		applyCustomCssVariables($state.snapshot(appState.custom_css_variables))
	}

	let importText = $state('')
	let exportFeedback = $state('')

	const exportTheme = async () => {
		const variables = appState.custom_css_variables || {}
		const themeString = Object.entries(variables)
			.map(([key, value]) => `${key}:${value}`)
			.join(';')

		try {
			await navigator.clipboard.writeText(themeString)
			exportFeedback = 'copied to clipboard'
			setTimeout(() => (exportFeedback = ''), 2000)
		} catch {
			exportFeedback = 'failed to copy'
			setTimeout(() => (exportFeedback = ''), 2000)
		}
	}

	const importTheme = () => {
		if (!importText.trim()) return

		try {
			const variables = {}
			const pairs = importText.split(';')

			for (const pair of pairs) {
				if (!pair.trim()) continue
				const [key, value] = pair.split(':')
				if (!key || !value) continue

				let cleanKey = key.trim()
				if (!cleanKey.startsWith('--')) {
					cleanKey = '--' + cleanKey
				}

				variables[cleanKey] = value.trim()
			}

			appState.custom_css_variables = {...appState.custom_css_variables, ...variables}
			applyCustomCssVariables($state.snapshot(appState.custom_css_variables))
			importText = ''
		} catch (error) {
			console.error('Failed to import theme:', error)
		}
	}
</script>

<section>
	<header>
		<h2>Theme editor</h2>
		<button onclick={resetToDefaults}>Reset theme to defaults</button>
	</header>

	<form>
		<div>
			<label>theme</label>
			<ThemeToggle />
		</div>

		{#each baseColors as variable (variable.name)}
			<div class:inactive={!isActiveVariable(variable)}>
				<label hidden for={`${uid}-${variable.name}`}>{variable.label}</label>
				<InputColor
					label={variable.label}
					value={getCurrentValue(variable)}
					onchange={(e) => updateVariable(variable.name, e.target.value)}
					id={`${uid}-${variable.name}`}
				/>
				<input
					hidden
					type="text"
					value={getCurrentValue(variable)}
					placeholder="e.g. #ff6b6b"
					onchange={(e) => updateVariable(variable.name, e.target.value)}
				/>
				<small>{variable.description}</small>
			</div>
		{/each}

		{#each overrides as variable (variable.name)}
			<div class:inactive={!isActiveVariable(variable)}>
				<label hidden for={`${uid}-${variable.name}`}>{variable.label}</label>
				<InputColor
					label={variable.label}
					value={getCurrentValue(variable) || '#808080'}
					onchange={(e) => updateVariable(variable.name, e.target.value)}
					id={`${uid}-${variable.name}`}
					disabled={!getCurrentValue(variable)}
				/>
				<input
					hidden
					type="text"
					value={getCurrentValue(variable)}
					placeholder="inherit"
					onchange={(e) => updateVariable(variable.name, e.target.value)}
				/>
				<small>{variable.description}</small>
			</div>
		{/each}

		<div>
			<label for={`${uid}--scaling`}>scale</label>
			<InputRange
				value={customVariables['--scaling'] || 1}
				min={0.9}
				max={1.1}
				step={0.05}
				id={`${uid}--scaling`}
				oninput={(e) => {
					console.log('Raw slider value:', e.target.value)
					updateVariable('--scaling', e.target.value)
				}}
			/>
			<span>{customVariables['--scaling'] || '1'}</span>
			<small>scale the interface to your measure</small>
		</div>

		<div>
			<label for={`${uid}--border-radius`}>rounded corners</label>
			<input
				type="checkbox"
				checked={customVariables['--border-radius'] !== '0'}
				onchange={(e) => updateVariable('--border-radius', e.target.checked ? '0.4rem' : '0')}
				id={`${uid}--border-radius`}
			/>
			<span></span>
			<small>Round, round, around we go</small>
		</div>

		<div>
			<label for={`${uid}--media-radius`}>rounded artwork</label>
			<input
				type="checkbox"
				checked={customVariables['--media-radius'] !== '0'}
				onchange={(e) => updateVariable('--media-radius', e.target.checked ? '0.4rem' : '0')}
				id={`${uid}--media-radius`}
			/>
			<span></span>
			<small>Round corners on track artwork</small>
		</div>

		<div>
			<label for={`${uid}-hide-artwork`}>hide track artwork</label>
			<input type="checkbox" bind:checked={appState.hide_track_artwork} id={`${uid}-hide-artwork`} />
			<span></span>
			<small>Toggle track thumbnails in track lists and player</small>
		</div>
	</form>

	<details class="theme-sharing">
		<summary>share theme</summary>
		<div class="export-section">
			<button onclick={exportTheme} type="button">Export theme</button>
			{#if exportFeedback}
				<span class="feedback">{exportFeedback}</span>
			{/if}
		</div>
		<div class="import-section">
			<input type="text" bind:value={importText} placeholder="paste theme string here" class="import-input" />
			<button onclick={importTheme} type="button" disabled={!importText.trim()}>Apply</button>
		</div>
	</details>
</section>

<style>
	section {
		margin-bottom: 1rem;
	}

	header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	input[type='text'] {
		width: 10rem;
	}

	form {
		margin-left: 1rem;
		display: flex;
		flex-flow: column;
		gap: 0.5rem;
		align-items: flex-start;
	}

	form label {
		user-select: none;
		&::after {
			content: '→';
			margin: 0 1rem 0 0.1em;
			display: inline-block;
		}
	}

	form > div {
		display: grid;
		grid-template-columns: auto auto 1fr;
		gap: 0 0.5rem;
		align-items: center;
	}

	small {
		grid-column: 1 / -1;
	}

	.inactive {
		display: none;
		opacity: 0.2;
	}

	details {
		margin-top: 1rem;
		margin-left: 1rem;
	}

	summary {
		cursor: pointer;
		user-select: none;
		margin-bottom: 0.5rem;
	}

	.custom-css {
		margin-top: 0.5rem;
	}

	.custom-css textarea {
		width: 100%;
		font-family: var(--monospace);
		font-size: var(--font-3);
		padding: 0.5rem;
		background: var(--gray-2);
		border: 1px solid var(--gray-6);
		border-radius: var(--border-radius);
	}

	.theme-sharing {
		margin-top: 1rem;
		margin-left: 1rem;
	}

	.export-section,
	.import-section {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.import-input {
		width: 20rem;
		font-family: var(--monospace);
		font-size: var(--font-3);
	}

	.feedback {
		font-size: var(--font-3);
		color: var(--color-accent);
	}
</style>
