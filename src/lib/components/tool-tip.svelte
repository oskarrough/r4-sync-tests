<script>
	/**
	 * @typedef {'label' | 'description' | 'toggletip'} TooltipType
	 * @typedef {'top' | 'bottom' | 'left' | 'right'} TooltipPosition
	 */

	/**
	 * @type {{
	 *   for: string
	 *   type?: TooltipType
	 *   content: string
	 *   position?: TooltipPosition
	 *   id?: string
	 * }}
	 */
	const {
		for: targetId,
		type = 'description',
		content = '',
		position = 'top',
		id = `tooltip-${crypto.randomUUID()}`,
		...rest
	} = $props()

	let isVisible = $state(false)
	let tooltipElement = $state(/** @type {HTMLElement?} */ (null))
	let targetElement = $state(/** @type {HTMLElement?} */ (null))

	$effect(() => {
		if (typeof document === 'undefined') return
		targetElement = document.getElementById(targetId)
		
		if (!targetElement) {
			console.warn(`Tooltip target element with id "${targetId}" not found`)
			return
		}

		// Set up ARIA relationships based on tooltip type
		if (type === 'label') {
			targetElement.setAttribute('aria-labelledby', id)
		} else if (type === 'description') {
			targetElement.setAttribute('aria-describedby', id)
		}

		// Set up event listeners based on type
		if (type === 'toggletip') {
			const handleClick = () => {
				isVisible = !isVisible
			}
			
			const handleClickOutside = (/** @type {MouseEvent} */ e) => {
				if (!targetElement?.contains(/** @type {Node} */ (e.target)) && !tooltipElement?.contains(/** @type {Node} */ (e.target))) {
					isVisible = false
				}
			}

			const handleEscape = (/** @type {KeyboardEvent} */ e) => {
				if (e.key === 'Escape') {
					isVisible = false
				}
			}

			targetElement.addEventListener('click', handleClick)
			document.addEventListener('click', handleClickOutside)
			document.addEventListener('keydown', handleEscape)

			return () => {
				targetElement?.removeEventListener('click', handleClick)
				document.removeEventListener('click', handleClickOutside)
				document.removeEventListener('keydown', handleEscape)
			}
		} else {
			// Regular tooltip - show on hover and focus
			const showTooltip = () => {
				isVisible = true
			}
			
			const hideTooltip = () => {
				isVisible = false
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
		}
	})
</script>

{#if isVisible && content}
	<div
		bind:this={tooltipElement}
		{id}
		role={type === 'toggletip' ? 'status' : 'tooltip'}
		class="tooltip tooltip-{position}"
		class:visible={isVisible}
		{...rest}
	>
		{#if type !== 'toggletip'}
			<span class="sr-only">; Has tooltip: </span>
		{/if}
		{content}
	</div>
{/if}

<style>
	.tooltip {
		--_triangle-size: 6px;
		--_bg: light-dark(white, var(--gray-12));
		--_shadow-alpha: light-dark(15%, 50%);
		
		--_bottom-tip: conic-gradient(from -30deg at bottom, rgba(0,0,0,0), var(--_bg) 1deg 60deg, rgba(0,0,0,0) 61deg) bottom / 100% 50% no-repeat;
		--_top-tip: conic-gradient(from 150deg at top, rgba(0,0,0,0), var(--_bg) 1deg 60deg, rgba(0,0,0,0) 61deg) top / 100% 50% no-repeat;
		--_right-tip: conic-gradient(from -120deg at right, rgba(0,0,0,0), var(--_bg) 1deg 60deg, rgba(0,0,0,0) 61deg) right / 50% 100% no-repeat;
		--_left-tip: conic-gradient(from 60deg at left, rgba(0,0,0,0), var(--_bg) 1deg 60deg, rgba(0,0,0,0) 61deg) left / 50% 100% no-repeat;

		position: absolute;
		z-index: 1000;
		padding: var(--space-2) var(--space-3);
		font-size: var(--font-2);
		color: CanvasText;
		background: var(--_bg);
		border-radius: var(--border-radius);
		white-space: nowrap;
		max-width: 250px;
		white-space: normal;
		text-wrap: balance;
		pointer-events: none;
		opacity: 0;
		transform: translateX(var(--_x, 0)) translateY(var(--_y, 0));
		transition: opacity 200ms ease, transform 200ms ease;
		will-change: filter;
		filter:
			drop-shadow(0 2px 4px hsl(0 0% 0% / var(--_shadow-alpha)))
			drop-shadow(0 8px 16px hsl(0 0% 0% / var(--_shadow-alpha)));
	}

	.tooltip::after {
		content: "";
		background: var(--_bg);
		position: absolute;
		z-index: -1;
		inset: 0;
		mask: var(--_tip);
	}

	.tooltip-top {
		bottom: calc(100% + var(--space-2) + var(--_triangle-size));
		left: 50%;
		--_x: -50%;
		--_tip: var(--_bottom-tip);
	}

	.tooltip-top::after {
		bottom: calc(var(--_triangle-size) * -1);
	}

	.tooltip-bottom {
		top: calc(100% + var(--space-2) + var(--_triangle-size));
		left: 50%;
		--_x: -50%;
		--_tip: var(--_top-tip);
	}

	.tooltip-bottom::after {
		top: calc(var(--_triangle-size) * -1);
	}

	.tooltip-left {
		right: calc(100% + var(--space-2) + var(--_triangle-size));
		top: 50%;
		--_y: -50%;
		--_tip: var(--_right-tip);
	}

	.tooltip-left::after {
		right: calc(var(--_triangle-size) * -1);
	}

	.tooltip-right {
		left: calc(100% + var(--space-2) + var(--_triangle-size));
		top: 50%;
		--_y: -50%;
		--_tip: var(--_left-tip);
	}

	.tooltip-right::after {
		left: calc(var(--_triangle-size) * -1);
	}

	/* Motion preferences for slide-in animation */
	@media (prefers-reduced-motion: no-preference) {
		.tooltip:not(.visible) {
			--_motion-offset: 4px;
		}
		
		.tooltip-top:not(.visible) {
			--_y: calc(-50% + var(--_motion-offset));
		}
		
		.tooltip-bottom:not(.visible) {
			--_y: calc(-50% - var(--_motion-offset));
		}
		
		.tooltip-left:not(.visible) {
			--_x: calc(-50% + var(--_motion-offset));
		}
		
		.tooltip-right:not(.visible) {
			--_x: calc(-50% - var(--_motion-offset));
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

	/* Show tooltip with transition delay */
	.tooltip.visible {
		opacity: 1;
		transition-delay: 200ms;
	}
</style>