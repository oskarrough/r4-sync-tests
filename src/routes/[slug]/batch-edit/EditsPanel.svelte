<script>
	let {edits, tracks, showSidebar, onClose, onCommit, onDiscard} = $props()
</script>

<aside class="scroll" class:visible={showSidebar}>
	<header>
		<h3>{edits.length} staged {edits.length === 1 ? 'edit' : 'edits'}</h3>
		<button onclick={onClose} aria-label="Close">×</button>
	</header>

	<main class="scroll">
		{#each edits as edit (edit.track_id + edit.field)}
			{@const track = tracks.find((t) => t.id === edit.track_id)}
			<div class="edit-item">
				<div class="edit-track">{track?.title || `Track ${edit.track_id}`}</div>
				<div class="edit-field">{edit.field}</div>
				<div class="edit-diff">
					<del>{edit.old_value || '(empty)'}</del>
					<ins>{edit.new_value}</ins>
				</div>
			</div>
		{/each}
	</main>

	<footer>
		<button onclick={onCommit} class="primary">Commit all</button>
		<button onclick={onDiscard}>Discard all</button>
	</footer>
</aside>

<style>
	aside {
		position: absolute;
		right: 0;
		top: 0;
		max-height: calc(100vh - 4rem);
		width: min(400px, 40%);
		background: var(--bg-2);
		border-left: 1px solid var(--gray-3);
		display: flex;
		flex-direction: column;
		transform: translateX(100%);
		transition: transform 200ms ease-out;
		z-index: 10;
	}

	aside.visible {
		transform: translateX(0);
	}

	header {
		padding: 1rem;
		border-bottom: 1px solid var(--gray-3);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	header h3 {
		margin: 0;
	}

	main {
		flex: 1;
		padding: 0.5rem;
	}

	.edit-item {
		padding: 0.75rem;
		border-bottom: 1px solid var(--gray-2);
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.5rem;
		grid-template-areas:
			'track field'
			'diff diff';
	}

	.edit-track {
		grid-area: track;
		font-weight: 500;
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.edit-field {
		grid-area: field;
		font-size: 0.8rem;
		color: var(--gray-6);
		text-transform: capitalize;
	}

	.edit-diff {
		grid-area: diff;
		font-size: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.edit-diff del {
		color: var(--gray-6);
		text-decoration: line-through;
		opacity: 0.7;
		word-break: break-all;
	}

	.edit-diff ins {
		color: var(--green-9);
		text-decoration: none;
		font-weight: 500;
		word-break: break-all;
	}

	footer {
		padding: 1rem;
		border-top: 1px solid var(--gray-3);
		display: flex;
		gap: 0.5rem;
	}

	footer button {
		flex: 1;
		padding: 0.5rem 1rem;
	}

	.primary {
		background: var(--accent);
		color: white;
		border: none;
	}
</style>
