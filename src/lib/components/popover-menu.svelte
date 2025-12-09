<script>
	import {untrack} from 'svelte'

	/** @type {{id: string, children?: import('svelte').Snippet, trigger?: import('svelte').Snippet, class?: string, closeOnClick?: boolean, [key: string]: any}} */
	let {id, children, trigger, class: className = '', closeOnClick = true, ...rest} = $props()

	let buttonEl = $state()
	let popoverEl = $state()

	// Position popover below button and optionally close on action click
	$effect(() => {
		if (!popoverEl) return
		const el = untrack(() => popoverEl)

		const handleToggle = () => {
			if (!el.matches(':popover-open') || !buttonEl) return
			const rect = buttonEl.getBoundingClientRect()
			const popoverRect = el.getBoundingClientRect()
			const left = Math.min(rect.left, window.innerWidth - popoverRect.width - 8)
			el.style.top = `${rect.bottom + 4}px`
			el.style.left = `${Math.max(8, left)}px`
		}

		const handleClick = (e) => {
			if (!closeOnClick) return
			const target = e.target
			if (target.closest('button, a') && !target.hasAttribute('popovertarget')) {
				el.hidePopover()
			}
		}

		el.addEventListener('toggle', handleToggle)
		el.addEventListener('click', handleClick)
		return () => {
			el.removeEventListener('toggle', handleToggle)
			el.removeEventListener('click', handleClick)
		}
	})
</script>

<div class="popover-menu {className}" {...rest}>
	<button type="button" popovertarget={id} bind:this={buttonEl}>
		{@render trigger?.()}
	</button>
	<div popover="auto" {id} bind:this={popoverEl}>
		{@render children?.()}
	</div>
</div>

<style>
	.popover-menu {
		position: relative;
	}

	[popover] {
		position: fixed;
		margin: 0;
		padding: 0.25rem;
		min-width: 10rem;
		background: var(--gray-2);
		border: 1px solid var(--gray-6);
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-modal);

		&:popover-open {
			display: flex;
			flex-direction: column;
			gap: 0.2rem;
		}

		:global(button),
		:global(a) {
			justify-content: flex-start;
		}
	}
</style>
