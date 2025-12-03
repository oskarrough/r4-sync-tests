<script>
	let {track, field, onEdit, canEdit = true} = $props()

	let isEditing = $state(false)
	let value = $derived(track?.[field] || '')

	function startEdit(e) {
		if (!canEdit) return
		e.stopPropagation()
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
	<span class="editable" class:readonly={!canEdit} onclick={startEdit}>
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
