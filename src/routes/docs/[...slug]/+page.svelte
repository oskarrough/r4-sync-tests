<script>
	let {data} = $props()
</script>

<svelte:head>
	<title>{data.slug} - r5 docs</title>
</svelte:head>

<nav>
	<a href="/docs">index</a>
	{#each data.docs.filter((d) => d !== 'index') as doc (doc)}
		<a href="/docs/{doc}">{doc}</a>
	{/each}
</nav>

<!-- eslint-disable svelte/no-at-html-tags -->
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
		margin: 0.5rem 0.5rem 10rem;
		:global(h1) {
			margin-block-start: 0.75rem;
			text-transform: uppercase;
		}
		:global(h2) {
			margin-block-start: 1rem;
		}
		:global(p, ul, ol) {
			margin-block-start: 0.75rem;
			margin-block-end: 0.75rem;
		}
		:global(code) {
			font-size: var(--font-3);
		}
	}
</style>
