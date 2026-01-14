<script>
	import {addTrack, updateTrack} from '$lib/tanstack/collections/tracks'
	import {fetchOEmbedTitle} from '$lib/utils'
	import * as m from '$lib/paraglide/messages'

	/** @type {{mode: 'create', channel: import('$lib/tanstack/collections/channels').Channel, trackId?: string, url?: string, title?: string, description?: string, discogs_url?: string, onsubmit?: (event: {data: {url: string, title: string} | null, error: Error | null}) => void} | {mode: 'edit', channel: {id: string, slug: string}, trackId: string, url?: string, title?: string, description?: string, discogs_url?: string, onsubmit?: (event: {data: {url: string, title: string} | null, error: Error | null}) => void}} */
	let {
		mode,
		channel,
		trackId,
		url: initialUrl = '',
		title: initialTitle = '',
		description: initialDescription = '',
		discogs_url: initialDiscogsUrl = '',
		onsubmit
	} = $props()

	let url = $derived(initialUrl)
	let title = $derived(initialTitle)
	let description = $derived(initialDescription)
	let discogs_url = $derived(initialDiscogsUrl)
	let submitting = $state(false)
	let fetchingTitle = $state(false)

	const isValidDiscogsUrl = $derived(discogs_url?.includes('discogs.com'))

	async function handleUrlBlur() {
		if (!url || title) return
		fetchingTitle = true
		try {
			const fetched = await fetchOEmbedTitle(url)
			if (fetched && !title) title = fetched
		} finally {
			fetchingTitle = false
		}
	}

	/** @param {Event} event */
	function handleDiscogsSuggestion(event) {
		const tags = /** @type {CustomEvent<string[]>} */ (event).detail
		const hashtags = tags.map((t) => `#${t}`).join(' ')
		description = description ? `${description} ${hashtags}` : hashtags
	}

	function reset() {
		url = ''
		title = ''
		description = ''
		discogs_url = ''
	}

	/** @param {SubmitEvent} event */
	async function handleSubmit(event) {
		event.preventDefault()
		if (!url || !title || submitting) return

		submitting = true
		try {
			if (mode === 'create') {
				await addTrack(channel, {
					url,
					title,
					description: description || undefined,
					discogs_url: discogs_url || undefined
				})
			} else {
				if (!trackId) throw new Error('Track ID required for update')
				await updateTrack(channel, trackId, {
					url,
					title,
					description: description || undefined,
					discogs_url: discogs_url || undefined
				})
			}
			onsubmit?.({data: {url, title}, error: null})
			if (mode === 'create') reset()
		} catch (error) {
			onsubmit?.({data: null, error: /** @type {Error} */ (error)})
		} finally {
			submitting = false
		}
	}
</script>

<form onsubmit={handleSubmit}>
	<fieldset disabled={submitting}>
		<label>
			<span>URL</span>
			<input type="url" bind:value={url} onblur={handleUrlBlur} required placeholder="https://..." />
		</label>

		<label>
			<span>Title {fetchingTitle ? '...' : ''}</span>
			<input type="text" bind:value={title} required placeholder="Track title" />
		</label>

		<label>
			<span>Description</span>
			<textarea bind:value={description} rows="2" placeholder="Optional description"></textarea>
		</label>

		<label>
			<span>Discogs URL</span>
			<input type="url" bind:value={discogs_url} placeholder="https://discogs.com/release/..." />
		</label>

		{#if isValidDiscogsUrl}
			<r4-discogs-resource url={discogs_url} suggestions="true" onsuggestion={handleDiscogsSuggestion}
			></r4-discogs-resource>
		{/if}

		<button type="submit" disabled={!url || !title || submitting}>
			{submitting ? m.common_save() + '...' : mode === 'create' ? m.track_add_title() : m.common_save()}
		</button>
	</fieldset>
</form>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	fieldset {
		display: contents;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	r4-discogs-resource {
		display: block;
		padding-left: 0.5rem;
		min-height: 6rem;
		font-size: var(--font-4);
		font-style: italic;

		:global(fieldset) {
			flex-flow: row wrap;
			font-style: normal;
		}
		:global(legend) {
			float: left;
		}
	}
</style>
