<script>
	let {track, field, edits, onEdit} = $props()

	let isEditing = $state(false)

	let originalValue = $derived(track?.[field] || '')

	let edit = $derived(edits.find((e) => e.track_id === track.id && e.field === field))
	let currentValue = $derived(edit ? edit.new_value : originalValue)
	let isDiff = $derived(!!edit)

	function startEdit(e) {
		e.stopPropagation()
		isEditing = true
	}

	function stopEdit() {
		isEditing = false
	}

	async function commitEdit(value) {
		stopEdit()
		await onEdit(track.id, field, value)
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
