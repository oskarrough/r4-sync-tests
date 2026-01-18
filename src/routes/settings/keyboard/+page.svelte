<script>
	import KeyboardEditor from '$lib/components/keyboard-editor.svelte'
	import * as m from '$lib/paraglide/messages'
</script>

<svelte:head>
	<title>{m.page_title_keyboard()}</title>
</svelte:head>

<article class="constrained">
	<a href="/settings">&larr; {m.nav_settings()}</a>
	<KeyboardEditor />
</article>
