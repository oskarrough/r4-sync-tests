<script>
	import ThemeEditor from '$lib/components/theme-editor.svelte'
	import * as m from '$lib/paraglide/messages'
</script>

<svelte:head>
	<title>{m.settings_appearance_title()}</title>
</svelte:head>

<article class="SmallContainer">
	<header>
		<p>{m.settings_appearance_nav()}</p>
	</header>
</article>

<ThemeEditor />

<style>
	article > header {
		margin-top: 0.5rem;
		margin-bottom: 1rem;
	}
</style>
