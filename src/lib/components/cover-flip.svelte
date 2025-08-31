<script>
	import gsap from 'gsap'
	import {verticalLoop} from '$lib/vertical-loop.js'

	/** @type {{
	 *  items: any[],
	 *  scrollItemsPerNotch?: number,
	 *  item: (args: {item: any, index: number, active: boolean}) => any,
	 *  active: (args: {item: any, index: number}) => any,
	 * }} */
	let {items, scrollItemsPerNotch = 1, item, active, ...rest} = $props()
	let container
	let loop
	let activeElement
	let activeIndex = $state(-1)

	$effect(() => {
		const elements = container?.children
		if (!elements.length) return

		loop = verticalLoop(elements, {
			paused: true,
			draggable: true,
			center: true,
			onChange: (element, index) => {
				activeElement?.classList.remove('active')
				element.classList.add('active')
				activeElement = element
				activeIndex = index
			}
		})

		// Smooth scrolling mapped to timeline time by items-per-notch
		const wrapTime = gsap.utils.wrap(0, loop.duration())
		const timePerItem = loop.duration() / elements.length
		let playhead = {time: 0}
		let lastActiveIndex = -1
		const scrub = gsap.to(playhead, {
			time: 0,
			onUpdate() {
				// Drive the loop timeline and update active preview while scrubbing
				loop.time(wrapTime(playhead.time))
				const i = typeof loop.closestIndex === 'function' ? loop.closestIndex() : -1
				if (i !== -1 && i !== lastActiveIndex) {
					activeElement?.classList.remove('active')
					const el = elements[i]
					el?.classList.add('active')
					activeElement = el
					lastActiveIndex = i
					activeIndex = i
				}
			},
			duration: 0,
			ease: 'power2.out',
			paused: true
		})

		function normalizeWheel(e) {
			// Normalize delta to discrete notches
			let dy = e.deltaY
			if (e.deltaMode === 1) {
				dy *= 16
			} else if (e.deltaMode === 2) {
				dy *= container?.clientHeight || 400
			}
			// Return normalized notches (typically -1 or 1)
			return Math.sign(dy) * Math.max(1, Math.abs(dy) / 100)
		}

		const handleWheel = (e) => {
			e.preventDefault()
			const notches = normalizeWheel(e)
			const deltaTime = notches * scrollItemsPerNotch * timePerItem
			// Snap instantly without tweening
			playhead.time += deltaTime
			loop.time(wrapTime(playhead.time))
			const i = typeof loop.closestIndex === 'function' ? loop.closestIndex() : -1
			if (i !== -1 && i !== lastActiveIndex) {
				activeElement?.classList.remove('active')
				const el = elements[i]
				el?.classList.add('active')
				activeElement = el
				lastActiveIndex = i
				activeIndex = i
			}
		}

		container.addEventListener('wheel', handleWheel, {passive: false})

		return () => {
			container?.removeEventListener('wheel', handleWheel)
			loop?.kill?.()
			loop = null
			activeElement = null
		}
	})

	const handleClick = (index) => {
		if (!loop) return
		loop.toIndex(index, {duration: 0, ease: 'power1.easeInOut'})
	}
</script>

<section class="CoverFlip" bind:this={container} {...rest}>
	{#each items as itemData, index (index)}
		<button class="CoverFlip-item" onclick={() => handleClick(index)}>
			{@render item({item: itemData, index, active: index === activeIndex})}
		</button>
	{/each}
</section>

{#if activeIndex > -1 && items[activeIndex]}
	{@render active({item: items[activeIndex], index: activeIndex})}
{/if}

<style>
	section {
		width: 30%;
		height: 50vh;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
	}

	button {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 10%;
		flex-shrink: 0;
		cursor: pointer;
	}
</style>
