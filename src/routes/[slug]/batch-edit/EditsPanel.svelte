<script>
	let {readonly, canEdit, edits, appliedEdits = [], tracksMap, onCommit, onDiscard, onUndo, onDelete} = $props()

	function getTrackTitle(trackId) {
		const track = tracksMap.get(trackId)
		return track?.title || `Track ${trackId}`
	}

	let error = $state('')
	let isCommitting = $state(false)

	async function handleCommit() {
		if (isCommitting) return

		error = ''
		isCommitting = true

		try {
			await onCommit()
		} catch (err) {
			error = err.message || 'Failed to commit edits'
		} finally {
			isCommitting = false
		}
	}

	async function handleDiscard() {
		error = ''
		try {
			await onDiscard()
		} catch (err) {
			error = err.message || 'Failed to discard edits'
		}
	}
</script>

<aside>
	<header>
		<h3>Preview {edits.length} {edits.length === 1 ? 'edit' : 'edits'}</h3>
		{#if canEdit}
			<menu>
				<button type="button" onclick={handleDiscard}>Discard</button>
				<button type="button" onclick={handleCommit} disabled={isCommitting}>
					{isCommitting ? 'Committing...' : 'Commit'}
				</button>
			</menu>
		{/if}
	</header>

	<div class="warn">
		{#if readonly}
			<p>v1 radios must be migrated to v2 before they can be updated</p>
		{:else}
			<p>You are not authorized to edit this channel</p>
		{/if}
	</div>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<main class="scroll">
		{#if edits.length > 0}
			<section>
				<h3>Pending edits</h3>
				<ol class="list">
					{#each edits as edit (edit.track_id + edit.field)}
						<li>
							<div class="diff-header">
								{getTrackTitle(edit.track_id)}
								<code>{edit.field}</code>
								{#if canEdit}
									<button onclick={() => onDelete(edit.track_id, edit.field)}>Delete</button>
								{/if}
							</div>
							<div class="diff-body">
								<div class="diff-line removed">- {edit.old_value || '(empty)'}</div>
								<div class="diff-line added">+ {edit.new_value}</div>
							</div>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		{#if appliedEdits.length > 0}
			<section>
				<details>
					<summary>Applied edits ({appliedEdits.length}) - can undo</summary>
					<ol class="list">
						{#each appliedEdits as edit (edit.track_id + edit.field)}
							<li>
								<div class="diff-header">
									{getTrackTitle(edit.track_id)}
									<code>{edit.field}</code>
									{#if canEdit}
										<button class="undo-btn" onclick={() => onUndo(edit.track_id, edit.field)} title="Undo this edit">
											↶ Undo
										</button>
									{/if}
								</div>
								<div class="diff-body">
									<div class="diff-line removed">- {edit.old_value || '(empty)'}</div>
									<div class="diff-line added">+ {edit.new_value}</div>
								</div>
							</li>
						{/each}
					</ol>
				</details>
			</section>
		{/if}
	</main>
</aside>

<style>
	aside {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--gray-2);
		border-left: 1px solid var(--gray-6);
	}

	aside > header {
		padding: 0.5rem;
		background: var(--gray-1);
		border-bottom: 1px solid var(--gray-7);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	menu {
		border-bottom: 1px solid var(--gray-3);
		display: flex;
		gap: 0.5rem;
	}

	main {
		flex: 1;
		/* padding: 0.5rem 0; */
	}

	section {
		margin-top: 1rem;
	}

	.warn,
	.error {
		padding: 0.2rem 0.5rem;
	}
	.warn {
		background: var(--color-yellow);
		color: var(--gray-1);
	}
	.error {
		background: var(--color-red);
		color: var(--gray-1);
	}

	summary,
	main h3 {
		font-weight: 500;
		color: var(--gray-10);
		margin: 0 0.5rem;
	}

	.list {
		margin: 0;

		li:first-child {
			border-top: 1px solid var(--gray-4);
		}
	}

	.diff-header {
		display: flex;
		padding: 0 0.5rem;
		justify-content: space-between;
		align-items: center;
	}

	.diff-body {
		font-family: var(--monospace);
	}

	.diff-line {
		padding: 0 0.5rem;
	}

	.diff-line.removed {
		background-color: light-dark(var(--color-red), transparent);
		color: var(--color-red);
	}

	.diff-line.added {
		background-color: light-dark(var(--color-green), transparent);
		color: var(--color-green);
	}
</style>
