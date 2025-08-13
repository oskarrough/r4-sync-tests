<script>
	let {readonly, edits, appliedEdits = [], tracks, onCommit, onDiscard, onUndo} = $props()

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
	{#if !readonly}
		<header>
			<h3>Preview {edits.length} {edits.length === 1 ? 'edit' : 'edits'}</h3>
			<menu>
				<button type="button" onclick={handleDiscard}>Discard</button>
				<button type="button" onclick={handleCommit} disabled={isCommitting}>
					{isCommitting ? 'Committing...' : 'Commit'}
				</button>
			</menu>
		</header>
	{:else}
		<p>v1 radios must be migrated to v2 before they can be updated</p>
	{/if}

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<div class="content scroll">
		{#if edits.length > 0}
			<section>
				<h3>Pending Edits</h3>
				<ol class="list">
					{#each edits as edit (edit.track_id + edit.field)}
						{@const track = tracks.find((t) => t.id === edit.track_id)}
						<li>
							<div class="diff-header">
								{track?.title || `Track ${edit.track_id}`}
								<code>{edit.field}</code>
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
				<h3>Applied edits (can undo)</h3>
				<ol class="list">
					{#each appliedEdits as edit (edit.track_id + edit.field)}
						{@const track = tracks.find((t) => t.id === edit.track_id)}
						<li>
							<div class="diff-header">
								{track?.title || `Track ${edit.track_id}`}
								<code>{edit.field}</code>
								<button
									class="undo-btn"
									onclick={() => onUndo(edit.track_id, edit.field)}
									title="Undo this edit"
								>
									↶ Undo
								</button>
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
	</div>
</aside>

<style>
	aside {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-2);
		border-left: 1px solid var(--gray-6);
	}

	header {
		padding: 0.2rem;
		background: var(--bg-3);
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

	.content {
		flex: 1;
		padding: 0.5rem 0;
	}

	.content section {
		margin-bottom: 2rem;
	}

	.content h3 {
		color: var(--gray-9);
		margin: 0 0.5rem;
	}

	.list {
		margin: 0;
		padding: 0;
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
		padding: 0.2rem 0.5rem;
	}

	.diff-line.removed {
		background-color: light-dark(#ffeef0, transparent);
		color: #d1242f;
	}

	.diff-line.added {
		background-color: light-dark(#e6ffed, transparent);
		color: #28a745;
	}

	.error {
		padding: 0.2rem;
		background: #ffeef0;
		color: #d1242f;
		border-bottom: 1px solid var(--gray-6);
	}
</style>
