<script>
	import gsap from 'gsap'
	import {Draggable} from 'gsap/Draggable'
	import {InertiaPlugin} from 'gsap/InertiaPlugin'

	gsap.registerPlugin(Draggable, InertiaPlugin)

	// Grid configuration
	const ITEMS = ['Alpha', 'Beta', 'Gamma']
	const CELL_WIDTH = 180
	const CELL_HEIGHT = CELL_WIDTH * 2 // aspect-ratio 1/2
	const GAP = 20
	const VIEWPORT_BUFFER = 4 // Extra cells beyond viewport for smooth dragging
	const THROTTLE_MS = 16 // ~60fps
	
	let gridDimensions = $state({cols: 7, rows: 7})
	
	let mainContainer
	let virtualPosition = {x: 0, y: 0} // Top-left origin, positive coordinates
	let draggable
	let rafId

	// Generate visible grid items based on virtual position
	function generateVisibleItems() {
		const spacingX = CELL_WIDTH + GAP
		const spacingY = CELL_HEIGHT + GAP
		
		// Calculate which cells are visible based on current position
		const startCol = Math.floor(virtualPosition.x / spacingX)
		const startRow = Math.floor(virtualPosition.y / spacingY)
		
		// Pre-allocate array for better performance
		const itemCount = gridDimensions.rows * gridDimensions.cols
		const items_array = new Array(itemCount)
		let index = 0
		
		for (let row = 0; row < gridDimensions.rows; row++) {
			for (let col = 0; col < gridDimensions.cols; col++) {
				const virtualX = startCol + col
				const virtualY = startRow + row
				const itemIndex = (Math.abs(virtualX) + Math.abs(virtualY)) % ITEMS.length
				
				items_array[index++] = {
					id: `${virtualX}-${virtualY}`,
					content: `${ITEMS[itemIndex]} (${virtualX}, ${virtualY})`,
					x: virtualX * spacingX,
					y: virtualY * spacingY
				}
			}
		}
		
		return items_array
	}
	
	let visibleItems = $state(generateVisibleItems())

	function updateViewport() {
		const vw = window.innerWidth
		const vh = window.innerHeight
		
		// Calculate how many cells we need to show with buffer for smooth dragging
		gridDimensions.cols = Math.ceil(vw / CELL_WIDTH) + VIEWPORT_BUFFER
		gridDimensions.rows = Math.ceil(vh / CELL_HEIGHT) + VIEWPORT_BUFFER
	}
	
	function updateGrid() {
		visibleItems = generateVisibleItems()
	}

	// Throttled update for smooth performance
	let lastUpdate = 0
	function throttledUpdate() {
		const now = Date.now()
		if (now - lastUpdate > THROTTLE_MS) {
			lastUpdate = now
			updateGrid()
		}
	}

	$effect(() => {
		if (!mainContainer) return

		updateViewport()
		updateGrid()

		// Create draggable with inverted movement (drag moves viewport, not content)
		draggable = Draggable.create(mainContainer, {
			type: 'x,y',
			inertia: true,
			trigger: mainContainer.parentElement, // Use parent as trigger area
			onDrag() {
				// Drag right = see content to the left (negative virtual position)
				virtualPosition.x = -this.x
				virtualPosition.y = -this.y
				throttledUpdate()
			},
			onThrowUpdate() {
				virtualPosition.x = -this.x
				virtualPosition.y = -this.y
				throttledUpdate()
			},
			onDragEnd() {
				// Force update on drag end to ensure grid is correct
				updateGrid()
			},
			onThrowComplete() {
				// Force update when throw completes
				updateGrid()
			}
		})[0]

		window.addEventListener('resize', () => {
			updateViewport()
			updateGrid()
		})

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