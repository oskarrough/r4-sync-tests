<script>
	import PgliteRepl from '$lib/components/pglite-repl.svelte'
	import * as m from '$lib/paraglide/messages'
</script>

<svelte:head>
	<title>{m.page_title_cli()}</title>
</svelte:head>

<article class="sdk">
	<header>
		<h1>{m.cli_heading()}</h1>
	</header>
	<section class="repl">
		<PgliteRepl />
	</section>
</article>

<style>
	.sdk {
		display: flex;
		flex-direction: column;
	}

	.sdk header {
		padding: 0.5rem;
		background: var(--gray-2);
		border-bottom: 1px solid var(--gray-4);
		display: flex;
		justify-content: space-between;
	}

	.repl {
		margin: 0.5rem;
	}
</style>
