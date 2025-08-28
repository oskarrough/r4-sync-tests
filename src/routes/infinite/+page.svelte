<script>
	import gsap from 'gsap'
	import {Draggable} from 'gsap/Draggable'
	import {InertiaPlugin} from 'gsap/InertiaPlugin'

	gsap.registerPlugin(Draggable, InertiaPlugin)

	const items = ['Alpha', 'Beta', 'Gamma']
	const cellWidth = 180
	const cellHeight = cellWidth * 2 // aspect-ratio 1/2
	const gap = 20
	
	let visibleCols = 7
	let visibleRows = 7
	
	let mainContainer
	let itemsContainer
	let virtualPosition = {x: 0, y: 0}
	let draggable
	let lastGridUpdate = {x: 0, y: 0}

	// Generate visible grid items based on virtual position
	function generateVisibleItems() {
		const spacingX = cellWidth + gap
		const spacingY = cellHeight + gap
		const items_array = []
		
		// Calculate starting virtual coordinates based on position
		const startCol = Math.floor(virtualPosition.x / spacingX) - Math.floor(visibleCols / 2)
		const startRow = Math.floor(virtualPosition.y / spacingY) - Math.floor(visibleRows / 2)
		
		for (let row = 0; row < visibleRows; row++) {
			for (let col = 0; col < visibleCols; col++) {
				const virtualX = startCol + col
				const virtualY = startRow + row
				const itemIndex = (Math.abs(virtualX) + Math.abs(virtualY)) % 3
				
				items_array.push({
					id: `${virtualX}-${virtualY}`,
					content: `${items[itemIndex]} (${virtualX}, ${virtualY})`,
					x: virtualX * spacingX - virtualPosition.x,
					y: virtualY * spacingY - virtualPosition.y
				})
			}
		}
		
		return items_array
	}
	
	let visibleItems = $state(generateVisibleItems())

	function updateViewport() {
		const vw = window.innerWidth
		const vh = window.innerHeight
		
		// Calculate how many cells we need to show with fixed dimensions
		visibleCols = Math.ceil(vw / cellWidth) + 2
		visibleRows = Math.ceil(vh / cellHeight) + 2
	}
	
	function updateGrid() {
		visibleItems = generateVisibleItems()
	}

	$effect(() => {
		if (!mainContainer) return

		updateViewport()
		updateGrid()

		// Create draggable with direct position updates
		draggable = Draggable.create(mainContainer, {
			type: 'x,y',
			inertia: {
				resistance: 100,
				velocityScale: 1.5
			},
			onDrag() {
				virtualPosition.x = -this.x
				virtualPosition.y = -this.y
				updateGrid()
			},
			onThrowUpdate() {
				virtualPosition.x = -this.x
				virtualPosition.y = -this.y
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
			<article style="left: {item.x}px; top: {item.y}px;">
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
	}

	main {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
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
