<script>
	let {track, field, onEdit, onTab, canEdit = true, isFocused = false} = $props()

	let isEditing = $state(false)
	let value = $derived(track?.[field] || '')

	// Start editing when cell becomes focused
	$effect(() => {
		if (isFocused && canEdit && !isEditing) {
			isEditing = true
		}
	})

	function startEdit(e) {
		if (!canEdit) return
		e?.stopPropagation()
		isEditing = true
	}

	function stopEdit() {
		isEditing = false
	}

	async function commitEdit(newValue) {
		stopEdit()
		if (newValue !== value) {
			await onEdit(track.id, field, newValue)
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Enter') {
			e.preventDefault()
			commitEdit(e.target.value)
		} else if (e.key === 'Escape') {
			e.preventDefault()
			stopEdit()
		} else if (e.key === 'Tab') {
			e.preventDefault()
			commitEdit(e.target.value)
			onTab?.(e.shiftKey ? -1 : 1)
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
		{value}
		class="inline-input"
		onblur={(e) => commitEdit(e.target.value)}
		onkeydown={handleKeydown}
		use:focus
	/>
{:else}
	<span class="editable" class:readonly={!canEdit} ondblclick={startEdit}>
		{value}&nbsp;
	</span>
{/if}

<style>
	.editable {
		cursor: pointer;
		display: block;
		width: 100%;
	}

	.editable.readonly {
		cursor: default;
	}

	.inline-input {
		width: 100%;
		font: inherit;
	}
</style>
