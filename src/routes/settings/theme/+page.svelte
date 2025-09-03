<script>
	import ThemeEditor from '$lib/components/theme-editor.svelte'
</script>

<svelte:head>
	<title>R4/Settings/Theme</title>
</svelte:head>

<article class="nopSmallContainer">
	<header>
		<p><a href="/settings">Settings</a> / Theme</p>
	</header>

	<section>
		<ThemeEditor />
	</section>
</article>

<style>
	article {
		margin: 0.5rem 0.5rem 0;
		padding-bottom: calc(var(--player-compact-space) + 4rem);
	}
</style>
