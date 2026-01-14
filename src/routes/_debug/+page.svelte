<script>
	import * as m from '$lib/paraglide/messages'
</script>

<svelte:head>
	<title>{m.page_title_playground()}</title>
</svelte:head>

<div class="SmallContainer">
	<menu class="grouped">
		<a href="/_debug/appstate">appstate</a>
		<a href="/_debug/async-test">async-test</a>
		<a href="/_debug/media-chrome">media-chrome</a>
		<a href="/_debug/spam-angel">spam-angel</a>
		<a href="/_debug/tanstack">tanstack</a>
		<a href="/_debug/tooltips">tooltips</a>
	</menu>
	<p>Here you'll find different debug pages meant to test the application.</p>
</div>
