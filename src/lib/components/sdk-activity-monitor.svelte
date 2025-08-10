<script>
	let {activityLog} = $props()
</script>

{#if activityLog.length > 0}
	<section class="activity">
		<h3>activity</h3>
		<ul>
			{#each activityLog as entry, i (i)}
				<li class={entry.source}>
					<small>{entry.timestamp.toLocaleTimeString()}</small>
					<span>{entry.operation}</span>
					{#if entry.duration}
						<em>{entry.duration}ms</em>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.activity ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.activity li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.2rem 0;
	}

	.activity li span {
		flex: 1;
	}

	.activity li.r4 span {
		color: var(--color-lavender);
	}

	.activity li.v1 span {
		color: var(--color-orange);
	}
</style>
