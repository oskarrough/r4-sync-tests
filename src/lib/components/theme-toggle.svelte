<script>
	import {toggleTheme as toggleThemeApi} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import Icon from '$lib/components/icon.svelte'

	const {matches: prefersLight} = window.matchMedia('(prefers-color-scheme: light)')
	const theme = $derived(appState.theme ?? (prefersLight ? 'light' : 'dark'))
	const icon = $derived(theme === 'light' ? 'moon' : 'sun')

	$effect(() => {
		if (theme === 'dark') {
			document.documentElement.classList.remove('light')
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
			document.documentElement.classList.add('light')
		}
	})
</script>

<button onclick={toggleThemeApi}>
	<Icon {icon} size={20} />
</button>
