<script>
	import {page} from '$app/state'
</script>

<article>
	<p>An error happened:</p>
	<h1>{page.status}: {page.error?.message || 'Unknown error'}</h1>
	<p>
		<a href="/recovery">Reset the app</a> (this wipes your local data only, e.g. safe, and usually solves it)
	</p>
	<p><button onclick={() => window.location.reload()}>Reload app</button></p>
</article>

<style>
	article {
		margin: 0.5rem;
		display: flex;
		flex-flow: column;
	}

	h1 + p {
		margin: 1rem;
	}
</style>
