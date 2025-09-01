import {generateAccentScale, generateGrayScale} from './generate-color-scales.js'

export function applyCustomCssVariables(customVariables = {}) {
	const root = document.documentElement

	console.log('applying', customVariables)

	// Reset everything if empty
	if (!Object.keys(customVariables).length) {
		// Clear accent scale
		for (let i = 1; i <= 12; i++) {
			root.style.removeProperty(`--accent-${i}`)
		}
		// Clear gray scale (will fallback to defaults in CSS)
		for (let i = 1; i <= 12; i++) {
			root.style.removeProperty(`--gray-${i}`)
		}
		// Clear other custom properties
		root.style.removeProperty('--color-accent')
		root.style.removeProperty('--bg-1')
		root.style.removeProperty('--button-bg')
		root.style.removeProperty('--button-color')
		root.style.removeProperty('--scaling')
		root.style.removeProperty('--border-radius')
		root.style.removeProperty('--media-radius')
		return
	}

	// Generate accent scale if base colors are provided
	const accentBaseLight = customVariables['--accent-base-light']
	const accentBaseDark = customVariables['--accent-base-dark']

	if (accentBaseLight || accentBaseDark) {
		const accentScale = generateAccentScale(accentBaseLight, accentBaseDark)
		Object.entries(accentScale).forEach(([name, value]) => {
			root.style.setProperty(name, value)
		})

		// Also set the main accent color
		const light = accentBaseLight || '#6d28d9'
		const dark = accentBaseDark || '#b8e68a'
		root.style.setProperty('--color-accent', `light-dark(${light}, ${dark})`)
	}

	// Generate gray scale if base colors are provided
	const grayBaseLight = customVariables['--gray-base-light']
	const grayBaseDark = customVariables['--gray-base-dark']

	if (grayBaseLight || grayBaseDark) {
		const grayScale = generateGrayScale(grayBaseLight, grayBaseDark)
		Object.entries(grayScale).forEach(([name, value]) => {
			root.style.setProperty(name, value)
		})
	}

	// Handle button overrides
	const buttonBgLight = customVariables['--button-bg-light']
	const buttonBgDark = customVariables['--button-bg-dark']
	if (buttonBgLight || buttonBgDark) {
		const light = buttonBgLight || 'var(--gray-1)'
		const dark = buttonBgDark || 'var(--gray-1)'
		root.style.setProperty('--button-bg', `light-dark(${light}, ${dark})`)
	}

	const buttonColorLight = customVariables['--button-color-light']
	const buttonColorDark = customVariables['--button-color-dark']
	if (buttonColorLight || buttonColorDark) {
		const light = buttonColorLight || 'var(--gray-12)'
		const dark = buttonColorDark || 'var(--gray-12)'
		root.style.setProperty('--button-color', `light-dark(${light}, ${dark})`)
	}

	// Apply all other custom variables (non-generated ones like scaling, border-radius)
	Object.entries(customVariables).forEach(([name, value]) => {
		const systemVariables = [
			'--accent-base-light',
			'--accent-base-dark',
			'--gray-base-light',
			'--gray-base-dark',
			'--button-bg-light',
			'--button-bg-dark',
			'--button-color-light',
			'--button-color-dark'
		]
		if (value && !systemVariables.includes(name)) {
			root.style.setProperty(name, value)
		}
	})
}
