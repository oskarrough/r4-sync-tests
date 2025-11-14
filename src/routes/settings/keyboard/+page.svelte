<script>
	import KeyboardEditor from '$lib/components/keyboard-editor.svelte'
	import * as m from '$lib/paraglide/messages'
</script>

<svelte:head>
	<title>{m.page_title_keyboard()}</title>
</svelte:head>

<article class="SmallContainer">
	<p><a href="/settings">{m.nav_settings()}</a> / {m.settings_keyboard()}</p>
	<KeyboardEditor />
</article>

<style>
	article {
		margin-bottom: calc(var(--player-compact-size));
	}
</style>
