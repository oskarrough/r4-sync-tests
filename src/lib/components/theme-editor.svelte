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
			name: '--accent-light',
			label: 'accent (light)',
			description: 'generates accent-1 through accent-12',
			default: '#6d28d9',
			theme: 'light'
		},
		{
			name: '--accent-dark',
			label: 'accent (dark)',
			description: 'generates accent-1 through accent-12',
			default: '#b8e68a',
			theme: 'dark'
		},
		{
			name: '--gray-light',
			label: 'gray (light)',
			description: 'generates gray-1 through gray-12',
			default: '#988B8B',
			theme: 'light'
		},
		{
			name: '--gray-dark',
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

		if (!themeString) {
			exportFeedback = 'no custom theme to export'
			setTimeout(() => (exportFeedback = ''), 3000)
			return
		}

		try {
			await navigator.clipboard.writeText(themeString)
			exportFeedback = `copied to clipboard (${Object.keys(variables).length} variables)`
			setTimeout(() => (exportFeedback = ''), 4000)
		} catch (error) {
			console.error('Clipboard error:', error)
			exportFeedback = 'failed to copy - check console'
			setTimeout(() => (exportFeedback = ''), 4000)
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

	const grays = [...Array(12).keys()].map((i) => `--gray-${i + 1}`)
	const accents = [...Array(12).keys()].map((i) => `--accent-${i + 1}`)
</script>

<section>
	<menu>
		<ThemeToggle />
		<button onclick={resetToDefaults}>Reset theme to defaults</button>
	</menu>

	<br/>

	<h2>Colors</h2>
	<!-- <p>Prefer your own style? Who doesn't. Choose a gray tone and an <em>accent</em> color.</p> -->
	{#each baseColors as variable, i (variable.name + i)}
		<div class:inactive={!isActiveVariable(variable)}>
			<label hidden for={`${uid}-${variable.name}`}>{variable.label}</label>
			<InputColor
				label={variable.label}
				value={getCurrentValue(variable)}
				onchange={(e) => updateVariable(variable.name, e.target.value)}
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
				value={getCurrentValue(variable)}
				onchange={(e) => updateVariable(variable.name, e.target.value)}
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

	<br/>

	<div class="color-grid">
		{#each grays as name (name)}
			<div class="color-swatch">
				<figure style="background-color: var({name})"></figure>
				<code>{name}</code>
			</div>
		{/each}
	</div>

	<div class="color-grid">
		{#each accents as name (name)}
			<div class="color-swatch">
				<figure style="background-color: var({name})"></figure>
				<code>{name}</code>
			</div>
		{/each}
	</div>

	<details class="theme-sharing">
		<summary class="Button">Share theme</summary>
		<div class="export-section">
			<button onclick={exportTheme} type="button">Export theme</button>
			{#if exportFeedback}
				<small>{exportFeedback}</small>
			{/if}
		</div>
		<div class="row">
			<input type="text" bind:value={importText} placeholder="Paste theme string here" class="import-input" />
			<button onclick={importTheme} type="button" disabled={!importText.trim()}>Apply</button>
		</div>
	</details>

	<br />

	<h2>Layout</h2>

	<form>
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
</section>

<style>
	section {
		margin-bottom: 1rem;
	}

	menu {
		margin: 1rem 0;
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
</style>
