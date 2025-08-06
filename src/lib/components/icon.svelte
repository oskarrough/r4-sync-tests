<script>
	/** @type {{icon: string, title?: string, className?: string, size?: number, children?: any}} */
	const {children, icon = '', title = '', className = '', size, ...rest} = $props()

	function toImportName(str, prefix = 'Icon') {
		const parts = str.split('-')
		for (let i = 0; i < parts.length; i++) {
			parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1)
		}
		parts.unshift(prefix)
		return parts.join('')
	}

	const iconName = $derived(toImportName(icon))
	let Icon = $state(null)

	$effect(async () => {
		if (!icon) {
			Icon = null
			return
		}

		try {
			const module = await import('obra-icons-svelte')
			Icon = module[iconName]
		} catch {
			Icon = null
		}
	})
</script>

<i class={`icon ${className}`} class:icon {title}>
	{#if Icon}
		<Icon {size} {...rest} />
	{/if}
	{#if children}
		{@render children()}
	{/if}
</i>

<style>
	.icon {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		font-style: normal;
	}
</style>
