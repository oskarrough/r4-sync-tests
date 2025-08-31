import gsap from 'gsap'
import {Draggable} from 'gsap/Draggable'
import {InertiaPlugin} from 'gsap/InertiaPlugin'

gsap.registerPlugin(Draggable, InertiaPlugin)

/*
This helper function makes a group of elements animate along the x-axis in a seamless, responsive loop.

Features:
 - Uses yPercent so that even if the heights change (like if the window gets resized), it should still work in most cases.
 - When each item animates to the left or right enough, it will loop back to the other side
 - Optionally pass in a config object with values like draggable: true, center: true, speed (default: 1, which travels at roughly 100 pixels per second), paused (boolean), repeat, reversed, and paddingBottom.
 - The returned timeline will have the following methods added to it:
   - next() - animates to the next element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
   - previous() - animates to the previous element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
   - toIndex() - pass in a zero-based index value of the element that it should animate to, and optionally pass in a vars object to control duration, easing, etc. Always goes in the shortest direction
   - current() - returns the current index (if an animation is in-progress, it reflects the final index)
   - times - an Array of the times on the timeline where each element hits the "starting" spot.
*/
/**
 * Create a seamless vertical looping timeline for a list of elements.
 *
 * @param {Element[]|NodeList|Array<HTMLElement>|string} items - Elements (or selector) to loop.
 * @param {Object} [config] - Loop configuration.
 * @param {boolean} [config.draggable=false] - Enable momentum dragging via GSAP Draggable.
 * @param {boolean|Element|string|Array<Element>} [config.center=false] - Center active item. `true` uses the items' parent; element/selector uses that container.
 * @param {number} [config.speed=1] - Scroll speed multiplier (1 ≈ 100px/sec).
 * @param {boolean} [config.paused=false] - Start the timeline paused.
 * @param {number} [config.repeat] - Number of repeats for the timeline (GSAP `repeat`).
 * @param {boolean} [config.reversed=false] - Start with the timeline reversed.
 * @param {number|string} [config.paddingBottom=0] - Extra bottom spacing (px); string is parsed with `parseFloat`.
 * @param {false|number|((v:number)=>number)} [config.snap=1] - Snap granularity. `false` disables; number = increment; function = custom snap.
 * @param {(el:Element, index:number)=>void} [config.onChange] - Called when the closest/active item changes.
 * @returns {import('gsap').core.Timeline & {
 *   next: (vars?: any) => any,
 *   previous: (vars?: any) => any,
 *   toIndex: (index: number, vars?: any) => any,
 *   current: () => number,
 *   times: number[],
 *   draggable?: any,
 *   closestIndex: (setCurrent?: boolean) => number,
 * }}
 */
export function verticalLoop(items, config) {
	let timeline
	items = gsap.utils.toArray(items)
	config = config || {}
	gsap.context(() => {
		// use a context so that if this is called from within another context or a gsap.matchMedia(), we can perform proper cleanup like the "resize" event handler on the window
		let onChange = config.onChange,
			lastIndex = 0,
			tl = gsap.timeline({
				repeat: config.repeat,
				onUpdate:
					onChange &&
					function () {
						let i = tl.closestIndex()
						if (lastIndex !== i) {
							lastIndex = i
							onChange(items[i], i)
						}
					},
				paused: config.paused,
				defaults: {ease: 'none'},
				onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)
			}),
			length = items.length,
			startY = items[0].offsetTop,
			times = [],
			heights = [],
			spaceBefore = [],
			yPercents = [],
			curIndex = 0,
			indexIsDirty = false,
			center = config.center,
			pixelsPerSecond = (config.speed || 1) * 100,
			snap = config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1), // some browsers shift by a pixel to accommodate flex layouts, so for example if height is 20% the first element's height might be 242px, and the next 243px, alternating back and forth. So we snap to 5 percentage points to make things look more natural
			timeOffset = 0,
			container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
			totalHeight,
			getTotalHeight = () =>
				items[length - 1].offsetTop +
				(yPercents[length - 1] / 100) * heights[length - 1] -
				startY +
				spaceBefore[0] +
				items[length - 1].offsetHeight * gsap.getProperty(items[length - 1], 'scaleY') +
				(Number(config.paddingBottom) || 0),
			populateHeights = () => {
				let b1 = container.getBoundingClientRect(),
					b2
				items.forEach((el, i) => {
					heights[i] = parseFloat(gsap.getProperty(el, 'height', 'px'))
					yPercents[i] = snap(
						(Number(gsap.getProperty(el, 'y', 'px')) / heights[i]) * 100 + gsap.getProperty(el, 'yPercent')
					)
					b2 = el.getBoundingClientRect()
					spaceBefore[i] = b2.top - (i ? b1.bottom : b1.top)
					b1 = b2
				})
				gsap.set(items, {
					// convert "y" to "yPercent" to make things responsive, and populate the heights/yPercents Arrays to make lookups faster.
					yPercent: (i) => yPercents[i]
				})
				totalHeight = getTotalHeight()
			},
			timeWrap,
			populateOffsets = () => {
				timeOffset = center ? (tl.duration() * (container.offsetHeight / 2)) / totalHeight : 0
					if (center) {
						times.forEach((t, i) => {
							times[i] = timeWrap(tl.labels['label' + i] + (tl.duration() * heights[i]) / 2 / totalHeight - timeOffset)
						})
					}
			},
			getClosest = (values, value, wrap) => {
				let i = values.length,
					closest = 1e10,
					index = 0,
					d
				while (i--) {
					d = Math.abs(values[i] - value)
					if (d > wrap / 2) {
						d = wrap - d
					}
					if (d < closest) {
						closest = d
						index = i
					}
				}
				return index
			},
			populateTimeline = () => {
				let i, item, curY, distanceToStart, distanceToLoop
				tl.clear()
				for (i = 0; i < length; i++) {
					item = items[i]
					curY = (yPercents[i] / 100) * heights[i]
					distanceToStart = item.offsetTop + curY - startY + spaceBefore[0]
					distanceToLoop = distanceToStart + heights[i] * gsap.getProperty(item, 'scaleY')
					tl.to(
						item,
						{yPercent: snap(((curY - distanceToLoop) / heights[i]) * 100), duration: distanceToLoop / pixelsPerSecond},
						0
					)
						.fromTo(
							item,
							{yPercent: snap(((curY - distanceToLoop + totalHeight) / heights[i]) * 100)},
							{
								yPercent: yPercents[i],
								duration: (curY - distanceToLoop + totalHeight - curY) / pixelsPerSecond,
								immediateRender: false
							},
							distanceToLoop / pixelsPerSecond
						)
						.add('label' + i, distanceToStart / pixelsPerSecond)
					times[i] = distanceToStart / pixelsPerSecond
				}
				timeWrap = gsap.utils.wrap(0, tl.duration())
			},
			refresh = (deep) => {
				let progress = tl.progress()
				tl.progress(0, true)
				populateHeights()
					if (deep) populateTimeline()
				populateOffsets()
					if (deep && tl.draggable && tl.paused()) {
						tl.time(times[curIndex], true)
					} else {
						tl.progress(progress, true)
					}
			},
			onResize = () => refresh(true),
			proxy
		gsap.set(items, {y: 0})
		populateHeights()
		populateTimeline()
		populateOffsets()
		window.addEventListener('resize', onResize)
		function toIndex(index, vars) {
			vars = vars || {}
				if (Math.abs(index - curIndex) > length / 2) {
					index += index > curIndex ? -length : length // always go in the shortest direction
				}
			let newIndex = gsap.utils.wrap(0, length, index),
				time = times[newIndex]
			if (time > tl.time() !== index > curIndex && index !== curIndex) {
				// if we're wrapping the timeline's playhead, make the proper adjustments
				time += tl.duration() * (index > curIndex ? 1 : -1)
			}
			if (time < 0 || time > tl.duration()) {
				vars.modifiers = {time: timeWrap}
			}
			curIndex = newIndex
			vars.overwrite = true
			gsap.killTweensOf(proxy)
			return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars)
		}
		tl.toIndex = (index, vars) => toIndex(index, vars)
		tl.closestIndex = (setCurrent) => {
			let index = getClosest(times, tl.time(), tl.duration())
			if (setCurrent) {
				curIndex = index
				indexIsDirty = false
			}
			return index
		}
		tl.current = () => (indexIsDirty ? tl.closestIndex(true) : curIndex)
		tl.next = (vars) => toIndex(tl.current() + 1, vars)
		tl.previous = (vars) => toIndex(tl.current() - 1, vars)
		tl.times = times
		tl.progress(1, true).progress(0, true) // pre-render for performance
		if (config.reversed) {
			tl.vars.onReverseComplete()
			tl.reverse()
		}
		if (config.draggable && typeof Draggable === 'function') {
			proxy = document.createElement('div')
				let wrap = gsap.utils.wrap(0, 1),
					ratio,
					startProgress,
					draggable,
					lastSnap,
				initChangeY,
				wasPlaying,
				align = () => tl.progress(wrap(startProgress + (draggable.startY - draggable.y) * ratio)),
				syncIndex = () => tl.closestIndex(true)
			if (typeof InertiaPlugin === 'undefined') {
				console.warn('InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club')
			}
			draggable = Draggable.create(proxy, {
				trigger: items[0].parentNode,
				type: 'y',
				onPressInit() {
					let y = this.y
					gsap.killTweensOf(tl)
					wasPlaying = !tl.paused()
					tl.pause()
					startProgress = tl.progress()
					refresh()
					ratio = 1 / totalHeight
					initChangeY = startProgress / -ratio - y
					gsap.set(proxy, {y: startProgress / -ratio})
				},
				onDrag: align,
				onThrowUpdate: align,
				overshootTolerance: 0,
				inertia: true,
				snap(value) {
					//note: if the user presses and releases in the middle of a throw, due to the sudden correction of proxy.x in the onPressInit(), the velocity could be very large, throwing off the snap. So sense that condition and adjust for it. We also need to set overshootTolerance to 0 to prevent the inertia from causing it to shoot past and come back
					if (Math.abs(startProgress / -ratio - this.y) < 10) {
						return lastSnap + initChangeY
					}
					let time = -(value * ratio) * tl.duration(),
						wrappedTime = timeWrap(time),
						snapTime = times[getClosest(times, wrappedTime, tl.duration())],
						dif = snapTime - wrappedTime
						if (Math.abs(dif) > tl.duration() / 2) {
							dif += dif < 0 ? tl.duration() : -tl.duration()
						}
					lastSnap = (time + dif) / tl.duration() / -ratio
					return lastSnap
				},
				onRelease() {
					syncIndex()
						if (draggable.isThrowing) indexIsDirty = true
				},
				onThrowComplete: () => {
					syncIndex()
						if (wasPlaying) tl.play()
				}
			})[0]
			tl.draggable = draggable
		}
		tl.closestIndex(true)
		lastIndex = curIndex
			if (onChange) onChange(items[curIndex], curIndex)
		timeline = tl
		return () => window.removeEventListener('resize', onResize) // cleanup
	})
	return timeline
}
