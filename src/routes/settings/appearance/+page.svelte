<script>
	import ThemeEditor from '$lib/components/theme-editor.svelte'
	import * as m from '$lib/paraglide/messages'
</script>

<svelte:head>
	<title>{m.settings_appearance_title()}</title>
</svelte:head>

<article class="constrained">
	<a href="/settings">&larr; {m.nav_settings()}</a>
</article>

<ThemeEditor />

<article class="constrained">
	<h2>Status classes</h2>
	<p class="error">Error message</p>
	<p class="warning">Warning message</p>
	<p class="success">Success message</p>
	<p><small>Muted text using small element</small></p>
</article>
