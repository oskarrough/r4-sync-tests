<script>
	let {trackId, field, editingCells, editsMap, stageFieldEdit, tracks} = $props()

	let cellKey = $derived(`${trackId}-${field}`)
	let isEditing = $derived(editingCells.has(cellKey))

	let track = $derived(tracks.find((t) => t.id === trackId))
	let originalValue = $derived(track?.[field] || '')

	let edit = $derived(editsMap.get(cellKey))
	let currentValue = $derived(edit ? edit.new_value : originalValue)
	let isDiff = $derived(editsMap.has(cellKey))

	function startEdit(e) {
		e.stopPropagation()
		editingCells.add(cellKey)
	}

	function stopEdit() {
		editingCells.delete(cellKey)
	}

	async function commitEdit(value) {
		stopEdit()
		await stageFieldEdit(trackId, field, value)
	}

	function handleKeydown(e) {
		if (e.key === 'Enter') {
			e.preventDefault()
			commitEdit(e.target.value)
		} else if (e.key === 'Escape') {
			e.preventDefault()
			stopEdit()
		}
	}

	function focus(element) {
		element?.focus()
		element?.select()
	}
</script>

{#if isEditing}
	<input
		type="text"
		value={currentValue}
		class="inline-input"
		onblur={(e) => commitEdit(e.target.value)}
		onkeydown={handleKeydown}
		use:focus
	/>
{:else if isDiff}
	<span class="editable diff" onclick={startEdit} title="{originalValue} → {currentValue}">
		<del>{originalValue || '(empty)'}</del>
		<ins>{currentValue}</ins>
	</span>
{:else}
	<span class="editable" onclick={startEdit}>
		{currentValue}
	</span>
{/if}

<style>
	.editable {
		cursor: pointer;
		padding: 0.1rem 0.2rem;
		border-radius: 2px;
		display: block;
		width: 100%;
	}

	.editable:hover {
		background: var(--gray-1);
	}

	.diff {
		background: var(--yellow-1);
	}

	.diff del {
		color: var(--gray-6);
		text-decoration: line-through;
		opacity: 0.7;
	}

	.diff ins {
		color: var(--green-9);
		text-decoration: none;
		font-weight: 500;
		margin-left: 0.25rem;
	}

	.inline-input {
		width: 100%;
		border: 1px solid var(--accent);
		background: var(--bg-1);
		padding: 0.1rem 0.2rem;
		font: inherit;
	}
</style>
