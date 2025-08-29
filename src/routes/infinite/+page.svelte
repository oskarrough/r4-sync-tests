<script>
	import gsap from 'gsap'
	import {Draggable} from 'gsap/Draggable'
	import {InertiaPlugin} from 'gsap/InertiaPlugin'
	import {InfiniteGrid, throttle} from '$lib/infinite-grid.js'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'

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
			const channels = data.channels.length > 0 ? data.channels : [{name: 'Loading...', slug: '', image: ''}]
			const itemIndex = (Math.abs(x) + Math.abs(y)) % channels.length
			const channel = channels[itemIndex]
			
			return {
				channel,
				coordinates: `(${x}, ${y})`
			}
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
			dragResistance: 0.5,
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
				<a href="/{item.content.channel.slug}" class="channel-link">
					<figure>
						<ChannelAvatar id={item.content.channel.image} alt={item.content.channel.name} size={64} />
					</figure>
					<h3>{item.content.channel.name}</h3>
					<small>{item.content.coordinates}</small>
				</a>
			</article>
		{/each}
	</main>
</div>

<style>
	.infinite-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
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
		position: absolute;
		/* must match width/height in infinite-grid js */
		width: 320px;
		height: 200px;

	}

	article a {
		display: flex;
		place-items: center;
		align-content: center;
		flex-flow: column;
		border-radius: var(--border-radius);
		background: var(--bg-2);
		text-decoration: none;
		padding: 1rem 0;
		gap: 0.5rem;
	}

	figure {
		width: 3rem;
	}

	h3 {
		font-size: var(--font-7);
		text-align: center;
		line-height: 1.2;
	}
</style>
