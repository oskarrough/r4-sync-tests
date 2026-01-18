import {mount, unmount} from 'svelte'
import TooltipComponent from './tool-tip.svelte'
import {uuid} from '$lib/utils'

/**
 * @typedef {'top' | 'bottom' | 'left' | 'right'} TooltipPosition
 */

/**
 * @param {{content: string, position?: TooltipPosition}} options
 * @returns {function(HTMLElement): () => void}
 */
export function tooltip(options) {
	return (element) => {
		if (!element.id) {
			element.id = `tooltip-target-${uuid()}`
		}

		const tooltipComponent = mount(TooltipComponent, {
			target: document.body,
			props: {
				id: `tooltip-${uuid()}`,
				targetId: element.id,
				content: options.content,
				position: options.position || 'bottom'
			}
		})

		return () => unmount(tooltipComponent)
	}
}
