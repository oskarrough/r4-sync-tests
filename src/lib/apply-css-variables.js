export function applyCustomCssVariables(customVariables = {}) {
	const root = document.documentElement

	console.log('applying', customVariables)

	// Reset everything if empty
	if (!Object.keys(customVariables).length) {
		// Clear base colors (scales will fallback to defaults in CSS)
		root.style.removeProperty('--gray-light')
		root.style.removeProperty('--gray-dark')
		root.style.removeProperty('--accent-light')
		root.style.removeProperty('--accent-dark')
		// Clear other custom properties
		root.style.removeProperty('--button-bg')
		root.style.removeProperty('--button-color')
		root.style.removeProperty('--scaling')
		root.style.removeProperty('--border-radius')
		root.style.removeProperty('--media-radius')
		return
	}

	// Set base colors directly - CSS will handle the scales
	const accentBaseLight = customVariables['--accent-light']
	const accentBaseDark = customVariables['--accent-dark']
	if (accentBaseLight) {
		root.style.setProperty('--accent-light', accentBaseLight)
	}
	if (accentBaseDark) {
		root.style.setProperty('--accent-dark', accentBaseDark)
	}

	const grayBaseLight = customVariables['--gray-light']
	const grayBaseDark = customVariables['--gray-dark']
	if (grayBaseLight) {
		root.style.setProperty('--gray-light', grayBaseLight)
	}
	if (grayBaseDark) {
		root.style.setProperty('--gray-dark', grayBaseDark)
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
			'--gray-light',
			'--gray-dark',
			'--accent-light',
			'--accent-dark',
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
