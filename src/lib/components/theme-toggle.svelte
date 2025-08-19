<script>
	import {toggleTheme as toggleThemeApi} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import Icon from '$lib/components/icon.svelte'

	const prefersLight = $derived(window.matchMedia('(prefers-color-scheme: light)').matches)
	const theme = $derived(appState.theme ?? (prefersLight ? 'light' : 'dark'))
	const icon = $derived(theme === 'light' ? 'moon' : 'sun')
</script>

<button onclick={toggleThemeApi}>
	<Icon {icon} size={20} />
</button>
