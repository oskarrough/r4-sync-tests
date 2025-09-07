<script>
	import {page} from '$app/state'
</script>

<article>
	<p>An error happened:</p>
	<h1>{page.status}: {page.error?.message || 'Unknown error'}</h1>

	<hr />
	<p class="row row--vcenter">
		To repair, please first try to ❶ <button onclick={() => window.location.reload()}>Reload the app</button>
	</p>

	<br />
	<p class="row row--vcenter">If that didn't work &rarr; ② <a href="/recovery" class="btn">Reset the app</a></p>
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
