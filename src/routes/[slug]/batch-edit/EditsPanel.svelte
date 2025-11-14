<script>
	import * as m from '$lib/paraglide/messages'

	let {readonly, canEdit, edits, appliedEdits = [], tracksMap, onCommit, onDiscard, onUndo, onDelete} = $props()

	function getTrackTitle(trackId) {
		const track = tracksMap.get(trackId)
		return track?.title || m.batch_edit_track_placeholder({id: trackId})
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
			error = err.message || m.batch_edit_error_commit()
		} finally {
			isCommitting = false
		}
	}

	async function handleDiscard() {
		error = ''
		try {
			await onDiscard()
		} catch (err) {
			error = err.message || m.batch_edit_error_discard()
		}
	}
</script>

<aside>
	<header>
		<h3>
			{edits.length === 1
				? m.batch_edit_preview_heading_one({count: edits.length})
				: m.batch_edit_preview_heading_other({count: edits.length})}
		</h3>
		{#if canEdit}
			<menu>
				<button type="button" onclick={handleDiscard}>{m.batch_edit_discard_button()}</button>
				<button type="button" onclick={handleCommit} disabled={isCommitting}>
					{isCommitting ? m.batch_edit_committing() : m.batch_edit_commit_button()}
				</button>
			</menu>
		{/if}
	</header>

	<div class="warn">
		{#if readonly}
			<p>{m.batch_edit_warning_v1()}</p>
		{:else}
			<p>{m.batch_edit_warning_no_access()}</p>
		{/if}
	</div>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<main class="scroll">
		{#if edits.length > 0}
			<section>
				<h3>{m.batch_edit_pending_heading()}</h3>
				<ol class="list">
					{#each edits as edit (edit.track_id + edit.field)}
						<li>
							<div class="diff-header">
								{getTrackTitle(edit.track_id)}
								<code>{edit.field}</code>
								{#if canEdit}
									<button onclick={() => onDelete(edit.track_id, edit.field)}>{m.batch_edit_delete()}</button>
								{/if}
							</div>
							<div class="diff-body">
								<div class="diff-line removed">- {edit.old_value || m.batch_edit_empty_value()}</div>
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
					<summary>{m.batch_edit_applied_summary({count: appliedEdits.length})}</summary>
					<ol class="list">
						{#each appliedEdits as edit (edit.track_id + edit.field)}
							<li>
								<div class="diff-header">
									{getTrackTitle(edit.track_id)}
									<code>{edit.field}</code>
									{#if canEdit}
										<button
											class="undo-btn"
											onclick={() => onUndo(edit.track_id, edit.field)}
											title={m.batch_edit_undo_title()}
										>
											{m.batch_edit_undo_button()}
										</button>
									{/if}
								</div>
								<div class="diff-body">
									<div class="diff-line removed">- {edit.old_value || m.batch_edit_empty_value()}</div>
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
