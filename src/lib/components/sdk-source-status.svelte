<script>
	let {sourceStatus} = $props()
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
	</div>

	<div class="source-row">
		<strong>V1</strong>
		<div class="lamp v1 {sourceStatus.v1.connected ? 'connected' : 'disconnected'}"></div>
		<small>{sourceStatus.v1.channels} ch</small>
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
</style>
