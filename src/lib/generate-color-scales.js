/**
 * Generates CSS for color scales from base colors
 * Uses CSS relative color syntax with oklch for predictable results
 */

/**
 * Default gray scale values - our carefully tuned defaults
 */
export const DEFAULT_GRAY_SCALE = {
	'--gray-1': 'light-dark(lch(97.5% 0 282), lch(7% 1.867 272))',
	'--gray-2': 'light-dark(lch(94% 2 282), lch(10% 3.033 272))',
	'--gray-3': 'light-dark(lch(92% 2 282), lch(14% 4.2 272))',
	'--gray-4': 'light-dark(lch(89% 0 282), lch(19% 3.54 272))',
	'--gray-5': 'light-dark(lch(85% 0 282), lch(25% 3.54 272))',
	'--gray-6': 'light-dark(lch(75% 1 282), lch(35% 1.35 272))',
	'--gray-7': 'light-dark(lch(65% 1 282), lch(45% 1.35 272))',
	'--gray-8': 'light-dark(lch(55% 1 282), lch(55% 1.35 272))',
	'--gray-9': 'light-dark(lch(45% 1 282), lch(65% 1.35 272))',
	'--gray-10': 'light-dark(lch(35% 1 282), lch(75% 2 104))',
	'--gray-11': 'light-dark(lch(20% 1 282), lch(90% 2 104))',
	'--gray-12': 'light-dark(lch(10% 0 282), lch(91% 6 104))'
}

/**
 * Generates a 12-step accent scale from a base color
 * Light backgrounds (1-3), interactive (4-8), solid colors (9-10), text (11-12)
 */
export function generateAccentScale(baseColorLight, baseColorDark) {
	if (!baseColorLight && !baseColorDark) return {}

	const light = baseColorLight || '#6d28d9'
	const dark = baseColorDark || '#b8e68a'

	return {
		'--accent-1': `light-dark(
			oklch(from ${light} 98% calc(c * 0.15) h),
			oklch(from ${dark} 12% calc(c * 0.2) h)
		)`,
		'--accent-2': `light-dark(
			oklch(from ${light} 95% calc(c * 0.25) h),
			oklch(from ${dark} 16% calc(c * 0.3) h)
		)`,
		'--accent-3': `light-dark(
			oklch(from ${light} 92% calc(c * 0.35) h),
			oklch(from ${dark} 20% calc(c * 0.4) h)
		)`,
		'--accent-4': `light-dark(
			oklch(from ${light} 88% calc(c * 0.45) h),
			oklch(from ${dark} 24% calc(c * 0.5) h)
		)`,
		'--accent-5': `light-dark(
			oklch(from ${light} 83% calc(c * 0.55) h),
			oklch(from ${dark} 28% calc(c * 0.6) h)
		)`,
		'--accent-6': `light-dark(
			oklch(from ${light} 77% calc(c * 0.65) h),
			oklch(from ${dark} 32% calc(c * 0.7) h)
		)`,
		'--accent-7': `light-dark(
			oklch(from ${light} 70% calc(c * 0.75) h),
			oklch(from ${dark} 38% calc(c * 0.8) h)
		)`,
		'--accent-8': `light-dark(
			oklch(from ${light} 62% calc(c * 0.85) h),
			oklch(from ${dark} 44% calc(c * 0.9) h)
		)`,
		'--accent-9': `light-dark(${light}, ${dark})`,
		'--accent-10': `light-dark(
			oklch(from ${light} calc(l * 0.85) c h),
			oklch(from ${dark} calc(l * 1.1) c h)
		)`,
		'--accent-11': `light-dark(
			oklch(from ${light} calc(l * 0.65) c h),
			oklch(from ${dark} calc(l * 1.2) c h)
		)`,
		'--accent-12': `light-dark(
			oklch(from ${light} 20% c h),
			oklch(from ${dark} 92% calc(c * 0.7) h)
		)`
	}
}

/**
 * Generates a 12-step gray scale from base colors
 * Can override with custom gray colors or use defaults
 */
export function generateGrayScale(baseGrayLight, baseGrayDark) {
	if (!baseGrayLight && !baseGrayDark) {
		return DEFAULT_GRAY_SCALE
	}

	const light = baseGrayLight || '#999999'
	const dark = baseGrayDark || '#666666'

	// Generate a gray scale with more saturation and contrast range
	return {
		'--gray-1': `light-dark(
			oklch(from ${light} 98% calc(c * 0.2) h),
			oklch(from ${dark} 8% calc(c * 0.4) h)
		)`,
		'--gray-2': `light-dark(
			oklch(from ${light} 95% calc(c * 0.3) h),
			oklch(from ${dark} 12% calc(c * 0.5) h)
		)`,
		'--gray-3': `light-dark(
			oklch(from ${light} 91% calc(c * 0.4) h),
			oklch(from ${dark} 16% calc(c * 0.6) h)
		)`,
		'--gray-4': `light-dark(
			oklch(from ${light} 86% calc(c * 0.5) h),
			oklch(from ${dark} 22% calc(c * 0.7) h)
		)`,
		'--gray-5': `light-dark(
			oklch(from ${light} 80% calc(c * 0.6) h),
			oklch(from ${dark} 28% calc(c * 0.8) h)
		)`,
		'--gray-6': `light-dark(
			oklch(from ${light} 71% calc(c * 0.7) h),
			oklch(from ${dark} 36% calc(c * 0.9) h)
		)`,
		'--gray-7': `light-dark(
			oklch(from ${light} 61% calc(c * 0.8) h),
			oklch(from ${dark} 46% calc(c * 1.0) h)
		)`,
		'--gray-8': `light-dark(
			oklch(from ${light} 51% calc(c * 0.9) h),
			oklch(from ${dark} 56% calc(c * 1.1) h)
		)`,
		'--gray-9': `light-dark(
			oklch(from ${light} 41% calc(c * 1.0) h),
			oklch(from ${dark} 66% calc(c * 1.2) h)
		)`,
		'--gray-10': `light-dark(
			oklch(from ${light} 31% calc(c * 1.1) h),
			oklch(from ${dark} 76% calc(c * 1.3) h)
		)`,
		'--gray-11': `light-dark(
			oklch(from ${light} 18% calc(c * 1.2) h),
			oklch(from ${dark} 89% calc(c * 1.4) h)
		)`,
		'--gray-12': `light-dark(
			oklch(from ${light} 10% calc(c * 1.3) h),
			oklch(from ${dark} 94% calc(c * 1.5) h)
		)`
	}
}
