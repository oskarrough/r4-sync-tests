<script>
	import MixBuilder from '$lib/components/mix-builder.svelte'
</script>

<svelte:head>
	<title>Mix</title>
</svelte:head>

<article class="constrained">
	<header>
		<h1>Mix</h1>
		<p>Build a playlist from multiple sources</p>
	</header>

	<MixBuilder />
</article>

<style>
	header {
		margin-bottom: 1rem;
	}

	h1 {
		margin: 0;
	}

	p {
		color: var(--gray-10);
		margin: 0.25rem 0 0;
	}
</style>
