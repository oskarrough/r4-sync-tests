<script>
	import gsap from 'gsap'
	import {Draggable} from 'gsap/Draggable'
	import {InertiaPlugin} from 'gsap/InertiaPlugin'
	import {InfiniteGrid, throttle} from '$lib/infinite-grid.js'
	
	gsap.registerPlugin(Draggable, InertiaPlugin)
	
	const ITEMS = ['Alpha', 'Beta', 'Gamma']
	
	const grid = new InfiniteGrid({
		cellWidth: 180,
		cellHeight: 360,
		gap: 20,
		viewportBuffer: 4,
		getContent: (x, y) => {
			const itemIndex = (Math.abs(x) + Math.abs(y)) % ITEMS.length
			return `${ITEMS[itemIndex]} (${x}, ${y})`
		}
	})
	
	let mainContainer
	let draggable
	let visibleItems = $state(grid.generateVisibleItems())
	
	const updateGrid = throttle(() => {
		visibleItems = grid.generateVisibleItems()
	}, 16)
	
	function updateViewport() {
		grid.updateViewport(window.innerWidth, window.innerHeight)
		updateGrid()
	}
	
	$effect(() => {
		if (!mainContainer) return
		
		updateViewport()
		
		// Create draggable with inverted movement (drag moves viewport, not content)
		draggable = Draggable.create(mainContainer, {
			type: 'x,y',
			inertia: true,
			trigger: mainContainer.parentElement,
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
	<main bind:this={mainContainer}>
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
		border: 1px solid var(--gray-7);
		display: flex;
		place-items: center;
		place-content: center;
		font-size: var(--font-7);
		position: absolute;
		background: var(--bg-2);
		width: 180px;
		aspect-ratio: 1 / 2;
	}
</style>