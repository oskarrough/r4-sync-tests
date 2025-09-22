<script>
	import KeyboardEditor from '$lib/components/keyboard-editor.svelte'
</script>

<svelte:head>
	<title>Keyboard shortcuts - R5</title>
</svelte:head>

<article class="SmallContainer">
	<p><a href="/settings">Settings</a> / Keyboard shortcuts</p>
	<KeyboardEditor />
</article>

<style>
	article {
		margin-bottom: calc(var(--player-compact-size));
	}
</style>
