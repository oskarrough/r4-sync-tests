<script>
	let {batchProgress} = $props()
</script>

{#if batchProgress.active}
	<section class="batch">
		<header>
			<strong>{batchProgress.operation}</strong>
			<span class="percentage"
				>{Math.round((batchProgress.currentBatch / batchProgress.totalBatches) * 100)}%</span
			>
		</header>
		<div class="progress-ascii">
			{#each Array.from({length: Math.min(batchProgress.totalBatches, 20)}, (_, i) => i) as i (i)}
				<span
					class="block {i < batchProgress.currentBatch
						? 'done'
						: i === batchProgress.currentBatch
							? 'active'
							: 'pending'}">█</span
				>
			{/each}
			{#if batchProgress.totalBatches > 20}
				<span class="overflow">+{batchProgress.totalBatches - 20}</span>
			{/if}
		</div>
		<footer>
			<span>batch {batchProgress.currentBatch}/{batchProgress.totalBatches}</span>
			<span>items: {batchProgress.completedItems}/{batchProgress.totalItems}</span>
			{#if batchProgress.errors > 0}
				<span class="errors">errors: {batchProgress.errors}</span>
			{/if}
		</footer>
	</section>
{/if}

<style>
	.batch {
		background: var(--gray-2);
		border: 1px solid var(--gray-4);
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.batch header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.batch .percentage {
		font-size: 1.2rem;
		font-weight: bold;
		color: var(--color-yellow);
	}

	.progress-ascii {
		display: flex;
		gap: 0.1rem;
		margin-bottom: 0.5rem;
		font-family: var(--monospace);
		align-items: center;
		flex-wrap: wrap;
	}

	.progress-ascii .block {
		font-size: 0.9rem;
		transition: color 0.3s ease;
	}

	.progress-ascii .block.pending {
		color: var(--gray-6);
	}

	.progress-ascii .block.done {
		color: var(--color-green);
	}

	.progress-ascii .block.active {
		color: var(--color-yellow);
		animation: pulse 1s ease infinite;
	}

	.progress-ascii .overflow {
		font-size: 0.75rem;
		color: var(--gray-9);
		margin-left: 0.3rem;
	}

	.batch footer {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: var(--gray-10);
	}

	.batch .errors {
		color: var(--color-red);
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.5);
		}
	}
</style>
