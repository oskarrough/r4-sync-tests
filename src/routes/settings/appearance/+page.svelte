<script>
	import ThemeEditor from '$lib/components/theme-editor.svelte'
	import * as m from '$lib/paraglide/messages'
</script>

<svelte:head>
	<title>{m.settings_appearance_title()}</title>
</svelte:head>

<article class="constrained">
	<header>
		<p>{m.settings_appearance_nav()}</p>
	</header>
</article>

<ThemeEditor />

<style>
	article > header {
		margin-bottom: 1rem;
	}
</style>
