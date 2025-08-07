<script>
	import {page} from '$app/state'
</script>

<article>
	<p>An error happened.</p>
	<h1>{page.status}: {page.error?.message || 'Unknown error'}</h1>
	<p><a href="/settings">Go to settings to reset the application.</a></p>
	<p><button onclick={() => window.location.reload()}>Reload app</button></p>
</article>

<style>
	article {
		margin: 0 0.5rem;
	}
</style>
