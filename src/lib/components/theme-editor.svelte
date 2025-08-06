<script>
	import {appState} from '$lib/app-state.svelte'

	const uid = $props.id()

	const cssVariables = [
		{
			name: '--color-accent',
			label: 'accent color',
			description: 'primary accent color for links and highlights',
			default: '#6d28d9'
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
		cssVariables.forEach(({name}) => {
			const value = customVariables[name]
			if (value) {
				root.style.setProperty(name, value)
			} else {
				root.style.removeProperty(name)
			}
		})
		// Handle --scaling separately
		const scalingValue = customVariables['--scaling']
		if (scalingValue) {
			root.style.setProperty('--scaling', scalingValue)
		} else {
			root.style.removeProperty('--scaling')
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
			<input
				type="range"
				min="0.9"
				max="1.1"
				step="0.05"
				value={customVariables['--scaling'] || '1'}
				oninput={(e) => updateVariable('--scaling', e.target.value)}
				id={`${uid}--scaling`}
			/>
			<span>{customVariables['--scaling'] || '1'}</span>
			<small>overall interface scaling</small>
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
		margin-bottom: 0.5rem;
		gap: 1rem;
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
		display: flex;
		flex-flow: column;
		gap: 1rem;
		align-items: flex-start;
	}

	form > div {
		display: grid;
		grid-template-columns: auto auto 1fr;
		gap: 0.5rem;
		align-items: center;
	}

	small {
		grid-column: 1 / -1;
	}
</style>
