<script>
	import gsap from 'gsap'
	import {extractYouTubeId} from '$lib/utils.ts'
	import {verticalLoop} from '$lib/vertical-loop.js'

	/** @typedef {import('$lib/types').Track} Track */

	/** @type {{
	 *  tracks: Track[],
	 *  scrollItemsPerNotch?: number,
	 *  item?: (args: {track: Track, index: number, active: boolean}) => any,
	 *  active?: (args: {track: Track, index: number}) => any,
	 * }} */
	let {tracks, scrollItemsPerNotch = 8, item, active} = $props()
	let container
	let loop
	let activeElement
	let activeIndex = $state(-1)

	let limitedTracks = $derived(tracks.slice(0, 30))

	$effect(() => {
		if (!container) return

		const items = gsap.utils.toArray('.box')

		// Don't initialize if no items
		if (!items.length) return

		loop = verticalLoop(items, {
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
		const timePerItem = loop.duration() / items.length
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
					const el = items[i]
					el?.classList.add('active')
					activeElement = el
					lastActiveIndex = i
					activeIndex = i
				}
			},
			duration: 0.22,
			ease: 'power2.out',
			paused: true
		})

		function normalizeWheel(e) {
			// Normalize delta to ~"notches" where 1 is a typical wheel step
			let dy = e.deltaY
			if (e.deltaMode === 1) {
				dy *= 16 // lines -> px
			} else if (e.deltaMode === 2) {
				dy *= container?.clientHeight || 400 // page -> px
			}
			return dy / 100
		}

		const handleWheel = (e) => {
			e.preventDefault()
			const notches = normalizeWheel(e)
				const deltaTime = notches * scrollItemsPerNotch * timePerItem
			// Tween toward target time for easing; don't set directly
			const targetTime = playhead.time + deltaTime
			scrub.vars.time = targetTime
			scrub.vars.overwrite = true
			scrub.invalidate().restart()
		}

		container.addEventListener('wheel', handleWheel, {passive: false})

		return () => {
			container?.removeEventListener('wheel', handleWheel)
			loop?.kill?.()
		}
	})

	const handleClick = (index) => {
		if (!loop) return
		loop.toIndex(index, {duration: 0.3, ease: 'power1.easeInOut'})
	}
</script>

<div class="wrapper" bind:this={container}>
	{#each limitedTracks as track, index (track.id)}
		{@const ytid = extractYouTubeId(track.url)}
		{#if ytid}
			<button class="box" onclick={() => handleClick(index)}>
				{#if item}
					{@render item({track, index, active: index === activeIndex})}
				{:else}
					<img src={`https://i.ytimg.com/vi/${ytid}/mqdefault.jpg`} alt={track.title} />
				{/if}
			</button>
		{/if}
	{/each}
</div>

{#if active && activeIndex > -1 && limitedTracks[activeIndex]}
	{@render active({track: limitedTracks[activeIndex], index: activeIndex})}
{/if}

<style>
	.wrapper {
		width: 30%;
		height: 50vh;
		border-top: dashed 2px var(--gray-7);
		border-bottom: dashed 2px var(--gray-7);
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
	}

	.box {
		background: transparent;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0.5rem;
		flex-shrink: 0;
		height: 20%;
		min-height: 100px;
		width: 80%;
		flex-shrink: 0;
		cursor: pointer;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	:global(.box.active) {
		transform: scale(1.2);
		background: var(--color-accent);
	}
</style>
