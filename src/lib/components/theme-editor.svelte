<script>
	import {appState} from '$lib/app-state.svelte'
	import InputRange from '$lib/components/input-range.svelte'
	import ThemeToggle from '$lib/components/theme-toggle.svelte'

	const uid = $props.id()

	const cssVariables = [
		{
			name: '--color-accent-light',
			label: 'accent color (light)',
			description: 'accent color for light theme',
			default: '#6d28d9'
		},
		{
			name: '--color-accent-dark',
			label: 'accent color (dark)',
			description: 'accent color for dark theme',
			default: '#b8e68a'
		}
	]

	const customVariables = $derived(appState.custom_css_variables || {})

	const getCurrentValue = (variable) => customVariables[variable.name] || variable.default

	const updateVariable = (name, value) => {
		appState.custom_css_variables = value.trim()
			? {...customVariables, [name]: value}
			: Object.fromEntries(Object.entries(customVariables).filter(([k]) => k !== name))
		applyVariablesToDOM()
	}

	const resetToDefaults = () => {
		appState.custom_css_variables = {}
		applyVariablesToDOM()
	}

	const applyVariablesToDOM = () => {
		const root = document.documentElement

		// Handle accent colors - create light-dark() value if both are set
		const lightAccent = customVariables['--color-accent-light']
		const darkAccent = customVariables['--color-accent-dark']
		if (lightAccent || darkAccent) {
			const light = lightAccent || '#6d28d9'
			const dark = darkAccent || '#b8e68a'
			root.style.setProperty('--color-accent', `light-dark(${light}, ${dark})`)
		} else {
			root.style.removeProperty('--color-accent')
		}

		// Handle --scaling separately
		const scalingValue = customVariables['--scaling']
		if (scalingValue) {
			root.style.setProperty('--scaling', scalingValue)
		} else {
			root.style.removeProperty('--scaling')
		}
		// Handle --border-radius separately
		const borderRadiusValue = customVariables['--border-radius']
		if (borderRadiusValue !== undefined) {
			root.style.setProperty('--border-radius', borderRadiusValue)
		} else {
			root.style.removeProperty('--border-radius')
		}
		// Handle --media-radius separately
		const mediaRadiusValue = customVariables['--media-radius']
		if (mediaRadiusValue !== undefined) {
			root.style.setProperty('--media-radius', mediaRadiusValue)
		} else {
			root.style.removeProperty('--media-radius')
		}
	}

	// Apply on initial load
	$effect(() => {
		applyVariablesToDOM()
	})
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
		{#each cssVariables as variable (variable.name)}
			<div>
				<label for={`${uid}-${variable.name}`}>{variable.label}</label>
				<input
					type="color"
					value={getCurrentValue(variable)}
					onchange={(e) => updateVariable(variable.name, e.target.value)}
					id={`${uid}-${variable.name}`}
				/>
				<input
					type="text"
					value={getCurrentValue(variable)}
					placeholder="e.g. #ff6b6b"
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

	input[type='color'] {
		width: 3rem;
		height: 2rem;
		border: none;
		border-radius: var(--border-radius);
		cursor: pointer;
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
</style>
