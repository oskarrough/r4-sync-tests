<script>
	let {data} = $props()
</script>

<svelte:head>
	<title>{data.slug} - r5 docs</title>
</svelte:head>

<nav>
	<a href="/docs">index</a>
	{#each data.docs.filter((d) => d !== 'index') as doc}
		<a href="/docs/{doc}">{doc}</a>
	{/each}
</nav>

<article>
	{@html data.html}
</article>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		border-block-end: 1px solid var(--color-border);
		margin: 0.5rem;
		gap: 0.2rem;
	}
	article {
		margin: 0.5rem;
		:global(h2) {
			margin-top: 2rem;
		}
		:global(code) {
			font-size: var(--font-3);
		}
	}
</style>
