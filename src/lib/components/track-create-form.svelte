<script>
	import {addTrack} from '$lib/tanstack/collections/tracks'
	import {fetchOEmbedTitle} from '$lib/utils/oembed'
	import * as m from '$lib/paraglide/messages'

	/** @type {{channel: import('$lib/tanstack/collections/channels').Channel, url?: string, title?: string, description?: string, onsubmit?: (event: {data: {url: string, title: string} | null, error: Error | null}) => void}} */
	let {
		channel,
		url: initialUrl = '',
		title: initialTitle = '',
		description: initialDescription = '',
		onsubmit
	} = $props()

	let url = $derived(initialUrl)
	let title = $derived(initialTitle)
	let description = $derived(initialDescription)
	let discogs_url = $state('')
	let submitting = $state(false)
	let fetchingTitle = $state(false)

	const isValidDiscogsUrl = $derived(discogs_url.includes('discogs.com'))

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
			await addTrack(channel, {
				url,
				title,
				description: description || undefined,
				discogs_url: discogs_url || undefined
			})
			onsubmit?.({data: {url, title}, error: null})
			reset()
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
			{submitting ? m.common_save() + '...' : m.track_add_title()}
		</button>
	</fieldset>
</form>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
	}
	fieldset {
		display: contents;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-3xs);
	}
</style>
