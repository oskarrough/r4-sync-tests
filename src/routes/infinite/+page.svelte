<script>
	import gsap from 'gsap'
	import {Draggable} from 'gsap/Draggable'
	import {InertiaPlugin} from 'gsap/InertiaPlugin'
	import {InfiniteGrid, throttle} from '$lib/infinite-grid.js'

	gsap.registerPlugin(Draggable, InertiaPlugin)

	/** @type {import('./$types').PageData} */
	const {data} = $props()

	let draggable
	const grid = new InfiniteGrid({
		cellWidth: 320,
		cellHeight: 200,
		gap: 40,
		viewportBuffer: 4,
		getContent: (x, y) => {
			// Use items array, with fallback for empty case
			const channelNames = items.length > 0 ? items : ['Loading...']
			const itemIndex = (Math.abs(x) + Math.abs(y)) % channelNames.length
			return `${channelNames[itemIndex]} (${x}, ${y})`
		}
	})

	let mainEl
	const items = $derived(data.channels.map((x) => x.name))
	let visibleItems = $state(grid.generateVisibleItems())

	const updateGrid = throttle(() => {
		visibleItems = grid.generateVisibleItems()
	}, 16)

	function updateViewport() {
		grid.updateViewport(window.innerWidth, window.innerHeight)
		updateGrid()
	}

	$effect(() => {
		if (!mainEl) return

		updateViewport()

		// Create draggable with inverted movement (drag moves viewport, not content)
		draggable = Draggable.create(mainEl, {
			type: 'x,y',
			inertia: true,
			trigger: mainEl.parentElement,
			onDrag() {
				// Drag right = see content to the left (negative virtual position)
				grid.setPosition(-this.x, -this.y)
				updateGrid()
			},
			onThrowUpdate() {
				grid.setPosition(-this.x, -this.y)
				updateGrid()
			},
			onDragEnd() {
				updateGrid()
			},
			onThrowComplete() {
				updateGrid()
			}
		})[0]

		window.addEventListener('resize', updateViewport)

		return () => {
			if (draggable) draggable.kill()
			window.removeEventListener('resize', updateViewport)
		}
	})
</script>

<div class="infinite-container">
	<main bind:this={mainEl}>
		{#each visibleItems as item (item.id)}
			<article style="transform: translate({item.x}px, {item.y}px);">
				{item.content}
			</article>
		{/each}
	</main>
</div>

<style>
	.infinite-container {
		position: fixed;
		inset: 10%;
		border: 2px solid var(--color-red);
		overflow: hidden;
		background: var(--bg-1);
		cursor: grab;
	}

	.infinite-container:active {
		cursor: grabbing;
	}

	main {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	article {
		border-radius: var(--border-radius);
		display: flex;
		place-items: center;
		place-content: center;
		font-size: var(--font-7);
		position: absolute;
		background: var(--bg-2);
		text-align: center;
		line-height: 1.2;
		/* must match width/height in infinite-grid js */
		width: 320px;
		height: 200px;
	}
</style>
