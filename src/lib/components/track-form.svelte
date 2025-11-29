<script>
	import {addTrack, updateTrack} from '../../routes/tanstack/collections'
	import * as m from '$lib/paraglide/messages'

	const uid = $props.id()

	/** @type {{id: string, slug: string} | undefined} */
	let {channel, track, initialUrl = '', onsubmit, oncancel} = $props()

	let url = $state(track?.url || initialUrl || '')
	let title = $state(track?.title || '')
	let description = $state(track?.description || '')
	let loading = $state(false)
	let error = $state('')

	const isEdit = $derived(!!track?.id)

	async function handleSubmit(e) {
		e.preventDefault()
		if (!channel) {
			error = 'No channel selected'
			return
		}

		loading = true
		error = ''

		try {
			if (isEdit) {
				await updateTrack(channel, track.id, {url, title, description})
			} else {
				await addTrack(channel, {url, title, description})
			}
			onsubmit?.({url, title, description})
		} catch (err) {
			error = err.message || 'Failed to save track'
		} finally {
			loading = false
		}
	}
</script>

<form onsubmit={handleSubmit}>
	<p>
		<label for="{uid}-url">URL</label>
		<input id="{uid}-url" type="url" bind:value={url} required placeholder="https://youtube.com/watch?v=..." />
	</p>

	<p>
		<label for="{uid}-title">Title</label>
		<input id="{uid}-title" type="text" bind:value={title} required placeholder="Artist - Track" />
	</p>

	<p>
		<label for="{uid}-description">Description</label>
		<textarea id="{uid}-description" bind:value={description} placeholder="Optional tags, notes..."></textarea>
	</p>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<menu>
		{#if oncancel}
			<button type="button" onclick={oncancel}>{m.common_cancel()}</button>
		{/if}
		<button type="submit" disabled={loading}>
			{loading ? '...' : isEdit ? m.common_save() : m.track_add_title()}
		</button>
	</menu>
</form>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	p {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	menu {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.error {
		color: var(--red);
	}
</style>
