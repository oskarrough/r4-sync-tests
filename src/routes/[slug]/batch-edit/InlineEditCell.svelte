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
		{currentValue}&nbsp;
	</span>
{/if}

<style>
	.editable {
		cursor: pointer;
		display: block;
		width: 100%;
	}

	.diff {
		background: var(--yellow-1);
	}

	.diff ins {
		margin-left: 0.25rem;
	}

	.inline-input {
		width: 100%;
		font: inherit;
	}
</style>
