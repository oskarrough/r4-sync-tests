<script>
	let {sourceStatus} = $props()

	let flowAnimation = $state({
		r4ToLocal: {active: false, blocks: []},
		v1ToLocal: {active: false, blocks: []}
	})

	function startFlow(source) {
		const flow = source === 'r4' ? flowAnimation.r4ToLocal : flowAnimation.v1ToLocal
		flow.active = true
		flow.blocks = []

		// Add flowing blocks
		for (let i = 0; i < 5; i++) {
			setTimeout(() => {
				if (flow.active) {
					flow.blocks.push({id: Date.now() + i, char: '█'})
				}
			}, i * 200)
		}

		// Clean up after animation
		setTimeout(() => {
			flow.active = false
			flow.blocks = []
		}, 3000)
	}

</script>

<section class="sources">
	<div>
		<strong>LOCAL</strong>
		<div class="lamp local {sourceStatus.local.connected ? 'connected' : 'disconnected'}"></div>
		<small>{sourceStatus.local.channels} ch, {sourceStatus.local.tracks} tr</small>
	</div>

	<div class="source-row">
		<strong>R4</strong>
		<div class="lamp r4 {sourceStatus.r4.connected ? 'connected' : 'disconnected'}"></div>
		<small>{sourceStatus.r4.channels} ch</small>
		<div class="flow-track">
			{#each flowAnimation.r4ToLocal.blocks as block (block.id)}
				<span class="flow-block r4-block">{block.char}</span>
			{/each}
		</div>
	</div>

	<div class="source-row">
		<strong>V1</strong>
		<div class="lamp v1 {sourceStatus.v1.connected ? 'connected' : 'disconnected'}"></div>
		<small>{sourceStatus.v1.channels} ch</small>
		<div class="flow-track">
			{#each flowAnimation.v1ToLocal.blocks as block (block.id)}
				<span class="flow-block v1-block">{block.char}</span>
			{/each}
		</div>
	</div>
</section>

<style>
	.sources {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.85rem;
		min-width: 200px;
	}

	.sources > div,
	.source-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
	}

	.sources strong {
		width: 3rem;
	}


	.lamp {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
	}

	.lamp.local.connected {
		background: var(--color-green);
		color: var(--color-green);
	}

	.lamp.r4.connected {
		background: var(--color-lavender);
		color: var(--color-lavender);
	}

	.lamp.v1.connected {
		background: var(--color-orange);
		color: var(--color-orange);
	}

	.lamp.disconnected {
		background: var(--gray-6);
		color: var(--gray-6);
		opacity: 0.3;
	}

	.flow-track {
		flex: 1;
		height: 1rem;
		position: relative;
		margin: 0 0.5rem;
		display: flex;
		align-items: center;
	}

	.flow-block {
		font-size: 0.8rem;
		animation: flowLeft 1s linear forwards;
		position: absolute;
		left: 0;
	}

	.r4-block {
		color: var(--color-lavender);
	}

	.v1-block {
		color: var(--color-orange);
	}


	@keyframes flowLeft {
		0% {
			left: 0;
			opacity: 0.8;
		}
		100% {
			left: calc(100% - 1rem);
			opacity: 0;
		}
	}
</style>
