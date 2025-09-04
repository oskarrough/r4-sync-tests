<script>
	import ThemeEditor from '$lib/components/theme-editor.svelte'
</script>

<svelte:head>
	<title>Appearance/theme settings</title>
</svelte:head>

<article class="SmallContainer">
	<header>
		<p><a href="/settings">Settings</a> / Appearance</p>
	</header>
</article>

<ThemeEditor />

<style>
	article > header {
		margin-top: 0.5rem;
		margin-bottom: 1rem;
	}
</style>
