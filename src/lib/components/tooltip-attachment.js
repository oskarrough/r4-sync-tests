import { mount, unmount } from 'svelte'
import TooltipComponent from './tool-tip.svelte'

/**
 * @typedef {'label' | 'description' | 'toggletip'} TooltipType
 * @typedef {'top' | 'bottom' | 'left' | 'right'} TooltipPosition
 */

/**
 * Tooltip attachment for use with {@attach tooltip(options)}
 * @param {{
 *   content: string
 *   type?: TooltipType
 *   position?: TooltipPosition
 * }} options - Tooltip configuration
 * @returns {function(HTMLElement): {destroy: function}}
 */
export function tooltip(options) {
	return function(element) {
		// Generate unique ID for the target element if it doesn't have one
		if (!element.id) {
			element.id = `tooltip-target-${Math.random().toString(36).substr(2, 9)}`
		}

		// Generate unique tooltip ID
		const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`

		// Create tooltip component instance using Svelte 5 mount
		const tooltipComponent = mount(TooltipComponent, {
			target: document.body,
			props: {
				id: tooltipId,
				for: element.id,
				content: options.content,
				type: options.type || 'description',
				position: options.position || 'bottom'
			}
		})

		// Return destroy function
		return {
			destroy() {
				unmount(tooltipComponent)
			}
		}
	}
}