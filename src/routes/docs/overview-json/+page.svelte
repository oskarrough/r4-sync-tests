<script>
	let {data} = $props()

	let allExpanded = $state(true)

	function toggleAll() {
		allExpanded = !allExpanded
	}

	const groupOrder = ['lib', 'app', 'packages', 'external', 'runtime', 'other']
	const groupLabels = {
		lib: 'lib modules',
		app: 'app modules',
		packages: 'packages',
		external: 'external docs',
		runtime: 'runtime',
		other: 'other'
	}

	const groups = $derived(groupFiles(data.overview))

	function groupFiles(overview) {
		const grouped = {}
		for (const [path, items] of Object.entries(overview)) {
			const key = groupKey(path)
			grouped[key] ??= []
			grouped[key].push({path, items})
		}

		return groupOrder
			.map((key) => ({
				key,
				label: groupLabels[key],
				files: (grouped[key] ?? []).sort((a, b) => a.path.localeCompare(b.path))
			}))
			.filter((group) => group.files.length > 0)
	}

	function groupKey(path) {
		if (path.startsWith('src/lib/')) return 'lib'
		if (path.startsWith('src/')) return 'app'
		if (path.startsWith('@')) return 'packages'
		if (path.startsWith('http')) return 'external'
		if (path.startsWith('window.')) return 'runtime'
		return 'other'
	}

	function isLink(path) {
		return path.startsWith('http')
	}
</script>

<svelte:head>
	<title>overview.json - r5 docs</title>
</svelte:head>

<article>
	<header>
		<h1>overview.json</h1>
		<p>
			Generated from <code>docs/overview.json</code>. See
			<a href="/docs/overview">overview.md</a> for the long form.
		</p>
		<button onclick={toggleAll}>{allExpanded ? 'Collapse all' : 'Expand all'}</button>
	</header>

	{#each groups as group (group.key)}
		<details class="group" open={allExpanded}>
			<summary><h2>{group.label}</h2></summary>
			{#each group.files as file (file.path)}
				<details open={allExpanded}>
					<summary>
						{#if isLink(file.path)}
							<a href={file.path}>{file.path}</a>
						{:else}
							<code>{file.path}</code>
						{/if}
						<small>({file.items.length})</small>
					</summary>
					<ul>
						{#each file.items as item (item.name)}
							<li>
								<span class="name">{item.name}</span>
								<span class="desc">{item.desc}</span>
							</li>
						{/each}
					</ul>
				</details>
			{/each}
		</details>
	{/each}
</article>

<style>
	details.group {
		margin-block-end: var(--space-3);
		> summary {
			h2 {
				display: inline;
			}
		}
	}
	details:not(.group) {
		margin-left: 0.5rem;
		margin-block-end: var(--space-2);
	}
	summary {
		cursor: pointer;
		font-weight: 500;
		code {
			font-size: 1em;
		}
		small {
			opacity: 0.6;
		}
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		gap: 1rem;
		padding-inline-start: 1rem;
	}
	.name {
		font-family: monospace;
		min-width: 45ch;
		flex-shrink: 0;
	}
	.desc {
		font-style: italic;
		opacity: 0.8;
	}
</style>
