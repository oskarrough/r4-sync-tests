<script>
	import {batchUpdateTracksUniform, batchUpdateTracksIndividual, deleteTrackMeta} from '../../tanstack/collections'
	import {extractYouTubeId} from '$lib/utils'

	/** @type {{selectedIds?: string[], channel: import('$lib/types').Channel | null, allTags?: {value: string, count: number}[], tracks?: import('$lib/types').TrackWithMeta[], onClear?: () => void}} */
	let {selectedIds = [], channel, allTags = [], tracks = [], onClear = () => {}} = $props()

	let showAppend = $state(false)
	let showRemoveTag = $state(false)
	let appendText = $state('')

	/** @type {import('$lib/types').TrackWithMeta[]} */
	let selectedTracks = $derived(selectedIds.map((id) => tracks.find((t) => t.id === id)).filter((t) => t !== undefined))

	// Tracks that have metadata duration but no track duration
	let tracksWithMetaDuration = $derived(selectedTracks.filter((t) => !t.duration && t.youtube_data?.duration))

	// Tracks that have any metadata
	let tracksWithMeta = $derived(selectedTracks.filter((t) => t.youtube_data || t.musicbrainz_data || t.discogs_data))

	// Tags present in selected tracks
	let selectedTracksTags = $derived.by(() => {
		const counts = {}
		for (const track of selectedTracks) {
			for (const tag of track.tags || []) {
				counts[tag] = (counts[tag] || 0) + 1
			}
		}
		return Object.entries(counts)
			.map(([tag, count]) => ({tag, count}))
			.sort((a, b) => b.count - a.count)
	})

	function closeDialogs() {
		showAppend = false
		showRemoveTag = false
		appendText = ''
	}

	async function append(text) {
		if (!text || !channel) return

		for (const track of selectedTracks) {
			const desc = track.description || ''
			const newDesc = desc ? `${desc} ${text}` : text
			await batchUpdateTracksUniform(channel, [track.id], {description: newDesc})
		}
		closeDialogs()
	}

	async function removeTag(tag) {
		if (!tag || !channel) return
		const tagPattern = new RegExp(`\\s*#${tag.replace('#', '')}\\b`, 'g')

		for (const track of selectedTracks) {
			const desc = track.description || ''
			const newDesc = desc.replace(tagPattern, '').trim()
			if (newDesc !== desc) {
				await batchUpdateTracksUniform(channel, [track.id], {description: newDesc})
			}
		}
		closeDialogs()
	}

	async function removeDuration() {
		if (!channel || selectedIds.length === 0) return
		await batchUpdateTracksUniform(channel, selectedIds, {duration: null})
	}

	async function copyDurationFromMeta() {
		if (!channel || tracksWithMetaDuration.length === 0) return
		const updates = tracksWithMetaDuration.map((t) => ({
			id: t.id,
			changes: {duration: t.youtube_data?.duration}
		}))
		await batchUpdateTracksIndividual(channel, updates)
	}

	function removeMeta() {
		const ytids = tracksWithMeta
			.map((t) => extractYouTubeId(t.url))
			.filter((id) => id !== null)
		if (ytids.length === 0) return
		deleteTrackMeta(ytids)
	}
</script>

<aside>
	<span class="count">Selected: {selectedIds.length}</span>

	<button onclick={() => (showAppend = true)}>Append...</button>
	<button onclick={() => (showRemoveTag = true)} disabled={selectedTracksTags.length === 0}>Remove tag...</button>
	{#if tracksWithMetaDuration.length > 0}
		<button onclick={copyDurationFromMeta}>Copy duration ({tracksWithMetaDuration.length})</button>
	{/if}
	<button onclick={removeDuration}>Remove duration</button>
	{#if tracksWithMeta.length > 0}
		<button onclick={removeMeta}>Remove meta ({tracksWithMeta.length})</button>
	{/if}
	<button onclick={onClear}>Clear</button>
</aside>

{#if showAppend}
	<dialog open>
		<h3>Append to {selectedIds.length} tracks</h3>
		<form
			onsubmit={(e) => {
				e.preventDefault()
				append(appendText)
			}}
		>
			<input type="text" bind:value={appendText} placeholder="text to append" autofocus />
			{#if allTags.length > 0}
				<menu>
					{#each allTags.slice(0, 10) as { value } (value)}
						<button type="button" onclick={() => (appendText = appendText ? `${appendText} #${value}` : `#${value}`)}
							>#{value}</button
						>
					{/each}
				</menu>
			{/if}
			<footer>
				<button type="button" onclick={closeDialogs}>Cancel</button>
				<button type="submit" disabled={!appendText.trim()}>Append</button>
			</footer>
		</form>
	</dialog>
{/if}

{#if showRemoveTag}
	<dialog open>
		<h3>Remove tag from {selectedIds.length} tracks</h3>
		<menu>
			{#each selectedTracksTags as { tag, count } (tag)}
				<button onclick={() => removeTag(tag)}>#{tag} ({count})</button>
			{/each}
		</menu>
		<footer>
			<button onclick={closeDialogs}>Cancel</button>
		</footer>
	</dialog>
{/if}

<style>
	aside {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		margin: 0.5rem;
	}

	.count {
		font-weight: bold;
		margin-right: 0.5rem;
	}

	dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: var(--gray-1);
		border: 1px solid var(--gray-5);
		padding: 1rem;
		min-width: 300px;
		z-index: 100;
	}

	dialog h3 {
		margin: 0 0 1rem;
	}

	dialog input {
		width: 100%;
		margin-bottom: 0.5rem;
	}

	dialog menu {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0;
		margin: 0.5rem 0;
	}

	dialog menu button {
		font-size: 0.85em;
	}

	dialog footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}
</style>
