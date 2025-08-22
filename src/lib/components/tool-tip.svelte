<script>
	/**
	 * @typedef {'top' | 'bottom' | 'left' | 'right'} TooltipPosition
	 */

	/**
	 * @type {{
	 *   for: string
	 *   content: string
	 *   position?: TooltipPosition
	 * }}
	 */
	const {
		for: targetId,
		content = '',
		position = 'bottom',
		...rest
	} = $props()

	const id = $props.id()

	let tooltipElement = $state(/** @type {HTMLElement?} */ (null))
	let targetElement = $state(/** @type {HTMLElement?} */ (null))

	$effect(() => {
		if (typeof document === 'undefined') return

		targetElement = document.getElementById(targetId)

		if (!targetElement) {
			console.warn(`Tooltip target element with id "${targetId}" not found`)
			return
		}

		// Set up ARIA relationship for description tooltip
		targetElement.setAttribute('aria-describedby', id)

		// Set up anchor for CSS anchor positioning with unique anchor name
		const anchorName = `--anchor-${id}`
		targetElement.style.anchorName = anchorName
		if (tooltipElement) {
			tooltipElement.style.positionAnchor = anchorName
		}

		// Set up event listeners using popover API
		const showTooltip = () => {
			tooltipElement?.showPopover?.()
		}

		const hideTooltip = () => {
			tooltipElement?.hidePopover?.()
		}

		targetElement.addEventListener('mouseenter', showTooltip)
		targetElement.addEventListener('mouseleave', hideTooltip)
		targetElement.addEventListener('focus', showTooltip)
		targetElement.addEventListener('blur', hideTooltip)

		return () => {
			targetElement?.removeEventListener('mouseenter', showTooltip)
			targetElement?.removeEventListener('mouseleave', hideTooltip)
			targetElement?.removeEventListener('focus', showTooltip)
			targetElement?.removeEventListener('blur', hideTooltip)
		}
	})
</script>

<div
	bind:this={tooltipElement}
	{id}
	popover="hint"
	role="tooltip"
	class="tooltip tooltip-{position}"
	{...rest}
>
	<span class="sr-only">; Has tooltip: </span>
	{content}
</div>

<style>
	.tooltip {
		--bg: light-dark(white, var(--gray-12));
		--shadow-alpha: light-dark(15%, 50%);

		position: absolute;
		overflow: hidden;
		margin: 0;
		border: none;
		padding: 0.2rem 0.5rem;
		font-size: var(--font-3);
		color: var(--gray-11);
		border: 1px solid var(--gray-6);
		background: var(--bg-1);
		border-radius: var(--border-radius);
		white-space: nowrap;
		max-width: 200px;
		white-space: normal;
		text-wrap: pretty;
		pointer-events: none;
	}

	/* Modern anchor positioning */
	@supports (top: anchor(bottom)) {
		.tooltip.tooltip-top {
			inset: unset;
			top: calc(anchor(top) - var(--space-2));
			justify-self: anchor-center;
		}

		.tooltip.tooltip-bottom {
			inset: unset;
			top: calc(anchor(bottom) + var(--space-2));
			justify-self: anchor-center;
		}

		.tooltip.tooltip-left {
			inset: unset;
			left: calc(anchor(left) - var(--space-2));
			align-self: anchor-center;
		}

		.tooltip.tooltip-right {
			inset: unset;
			left: calc(anchor(right) + var(--space-2));
			align-self: anchor-center;
		}
	}


	/* Screen reader only text */
	.sr-only {
		clip: rect(1px, 1px, 1px, 1px);
		clip-path: inset(50%);
		height: 1px;
		width: 1px;
		margin: -1px;
		overflow: hidden;
		padding: 0;
		position: absolute;
	}
</style>
