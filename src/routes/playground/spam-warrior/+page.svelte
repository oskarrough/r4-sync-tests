<script>
	import {onMount} from 'svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import {r5} from '$lib/r5'
	import {pg} from '$lib/r5/db'
	import {analyzeChannel, analyzeChannels, clearChannelSpam, getChannelTracks} from './spam-detector.js'

	/** @type {Array<import('$lib/types').Channel & {spamAnalysis: {confidence: number, reasons: string[], isSpam: boolean}}>} */
	let allChannels = $state([])
	let loading = $state(true)
	let filterMode = $state('needsReview')
	let batchFetching = $state(false)
	let batchProgress = $state('')

	const filteredChannels = $derived.by(() => {
		const highConfidenceSpam = allChannels.filter((ch) => ch.spamAnalysis.confidence > 0.3 && (ch.track_count ?? 0) < 5)

		const needsReview = allChannels.filter((ch) => !highConfidenceSpam.includes(ch))

		if (filterMode === 'highConfidenceSpam') {
			return highConfidenceSpam
		} else if (filterMode === 'needsReview') {
			return needsReview
		} else {
			return allChannels
		}
	})

	const undecidedChannels = $derived(filteredChannels.filter((ch) => ch.spam == null))
	const deleteChannels = $derived(filteredChannels.filter((ch) => ch.spam === true))
	const keepChannels = $derived(filteredChannels.filter((ch) => ch.spam === false))

	const sqlCommands = $derived(
		deleteChannels.map(
			(channel) =>
				`-- Delete channel: ${channel.name} (${channel.slug})
DELETE FROM channel_track WHERE channel_id = '${channel.id}';
DELETE FROM channels WHERE id = '${channel.id}';`
		)
	)

	async function loadChannels() {
		loading = true
		try {
			const rawChannels = await r5.channels.local()
			const analyzedChannels = analyzeChannels(rawChannels)
			allChannels = analyzedChannels

			// Debug spam values
			const spamChannels = rawChannels.filter((ch) => ch.spam === true)
			const nonSpamChannels = rawChannels.filter((ch) => ch.spam === false)
			console.log(
				`spam_warrior:load_channels ${rawChannels.length} channels, ${spamChannels.length} marked as spam, ${nonSpamChannels.length} marked as not spam`
			)
		} catch (error) {
			console.error('spam_warrior:load_channels_error', error)
		} finally {
			loading = false
		}
	}

	onMount(loadChannels)

	/** @param {typeof channels[0]} channel */
	async function markForDeletion(channel) {
		channel.spam = true
		await pg.sql`UPDATE channels SET spam = true WHERE id = ${channel.id}`
	}

	/** @param {typeof channels[0]} channel */
	async function markToKeep(channel) {
		channel.spam = false
		await pg.sql`UPDATE channels SET spam = false WHERE id = ${channel.id}`
	}

	function copyAllSQL() {
		const allSQL = sqlCommands.join('\n\n')
		navigator.clipboard.writeText(allSQL)
		alert('SQL commands copied to clipboard!')
	}

	/** @param {typeof channels[0]} channel */
	async function undoDecision(channel) {
		channel.spam = undefined
		await clearChannelSpam(channel.id)
	}

	async function clearAllSelections() {
		if (!confirm('Clear all spam/keep decisions? This will reset all channels to undecided.')) {
			return
		}

		try {
			await pg.sql`UPDATE channels SET spam = NULL WHERE spam IS NOT NULL`

			// Reset all channels in memory
			for (const channel of allChannels) {
				channel.spam = undefined
			}

			// Force reactivity
			allChannels = [...allChannels]

			alert('All selections cleared!')
		} catch (error) {
			console.error('Failed to clear selections:', error)
			alert('Failed to clear selections')
		}
	}

	async function batchFetchTracks() {
		// Check which channels actually have local tracks
		const channelsNeedingTracks = []
		for (const channel of filteredChannels) {
			const localTracks = await getChannelTracks(channel.id)
			if (localTracks.length === 0) {
				channelsNeedingTracks.push(channel)
			}
		}
		const channelsWithoutTracks = channelsNeedingTracks

		if (channelsWithoutTracks.length === 0) {
			alert('No channels without tracks found in current filter')
			return
		}

		if (
			!confirm(`Pull tracks for all ${channelsWithoutTracks.length} channels without tracks? This might take a while.`)
		) {
			return
		}

		batchFetching = true
		batchProgress = `Fetching tracks for ${channelsWithoutTracks.length} channels...`

		try {
			for (let i = 0; i < channelsWithoutTracks.length; i++) {
				const channel = channelsWithoutTracks[i]
				batchProgress = `Fetching ${i + 1}/${channelsWithoutTracks.length}: ${channel.name}`

				try {
					await r5.tracks.pull({slug: channel.slug})
					// Refresh the track count for this channel
					const {rows} = await pg.sql`
						SELECT COUNT(t.id) as track_count
						FROM tracks t
						WHERE t.channel_id = ${channel.id}
					`
					const newCount = rows[0]?.track_count ?? 0
					channel.track_count = newCount
					// Update the stored track_count for faster future queries
					await pg.sql`UPDATE channels SET track_count = ${newCount} WHERE id = ${channel.id}`
				} catch (error) {
					console.error(`batch_fetch_tracks_error: Failed to fetch tracks for ${channel.slug}:`, error)
				}

				// Small delay to avoid overwhelming the API
				// await new Promise(resolve => setTimeout(resolve, 100))
			}

			// Re-analyze channels with track data
			for (const channel of channelsWithoutTracks) {
				if ((channel.track_count ?? 0) > 0) {
					try {
						const tracks = await getChannelTracks(channel.id)
						channel.spamAnalysis = analyzeChannel(channel, tracks)
					} catch (error) {
						console.error(`Failed to re-analyze ${channel.slug}:`, error)
					}
				}
			}

			// Force reactivity
			allChannels = [...allChannels]
			batchProgress = `✅ Completed batch fetch for ${channelsWithoutTracks.length} channels`

			setTimeout(() => {
				batchProgress = ''
			}, 3000)
		} catch (error) {
			console.error('Batch fetch error:', error)
			batchProgress = `❌ Batch fetch failed: ${error instanceof Error ? error.message : String(error)}`
		} finally {
			batchFetching = false
		}
	}
</script>

<svelte:head>
	<title>Spam Channel Review - R5 Admin</title>
</svelte:head>

<main>
	<header>
		<h1>Spam Warrior</h1>
		<p>
			Review {filterMode === 'highConfidenceSpam'
				? 'high confidence spam channels'
				: filterMode === 'needsReview'
					? 'channels that need manual review'
					: 'all local channels'} and generate SQL commands for deletion.
		</p>
	</header>

	{#if loading}
		<p>Loading...</p>
	{:else}
		<p>
			{undecidedChannels.length} pending • {deleteChannels.length} delete • {keepChannels.length} keep
			<em>({filteredChannels.length} filtered / {allChannels.length} total channels)</em>
		</p>

		<menu class="controls">
			<label>
				<input type="radio" bind:group={filterMode} value="highConfidenceSpam" />
				High confidence spam (algorithm + &lt;5 tracks)
			</label>
			<label>
				<input type="radio" bind:group={filterMode} value="needsReview" />
				Needs review (everything else)
			</label>
		</menu>

		<div class="batch-controls">
			<button onclick={batchFetchTracks} disabled={batchFetching}>
				{batchFetching ? 'Fetching...' : 'Pull tracks for all channels'}
			</button>
			{#if batchProgress}
				<span>{batchProgress}</span>
			{/if}
		</div>

		<menu>
			<button onclick={clearAllSelections} style="background: var(--color-orange)"> Clear All Selections </button>
		</menu>

		{#if sqlCommands.length > 0}
			<section>
				<h2>
					Generated SQL commands ({sqlCommands.length})
					<button onclick={copyAllSQL}>Copy All SQL</button>
				</h2>
				<textarea readonly class="sql-output">{sqlCommands.join('\n\n')}</textarea>
			</section>
		{/if}

		<section class="channels">
			<h2>
				Channels for Review ({undecidedChannels.length})
			</h2>

			{#each undecidedChannels as channel (channel.id)}
				<div class="channel">
					<div class="channel-avatar">
						<ChannelAvatar id={channel.image} alt={channel.name} size={64} />
					</div>
					<div class="channel-content">
						<strong><a href="/{channel.slug}">{channel.name}</a></strong> (@{channel.slug})
						{#if channel.source === 'v1'}
							<span
								style="background: var(--color-blue); color: white; padding: 0.1rem 0.3rem; border-radius: 0.2rem; font-size: 0.7rem;"
								>V1</span
							>
						{/if}
						<span class="track-count">{channel.track_count ?? 0} tracks</span>
						<em>{Math.round(channel.spamAnalysis.confidence * 100)}% spam</em>
						{#if channel.description && channel.description.trim()}
							<div class="description">
								{channel.description.length > 400 ? channel.description.slice(0, 400) + '...' : channel.description}
							</div>
						{:else}
							<div class="description no-description">
								<em>No description</em>
							</div>
						{/if}
						{#if channel.spamAnalysis.reasons.length > 0}
							<span style="background: var(--color-orange)">{channel.spamAnalysis.reasons.join(', ')}</span>
						{/if}

						<div class="channel-tracks">
							{#await getChannelTracks(channel.id)}
								{#if (channel.track_count ?? 0) > 0}
									<details open>
										<summary>Sample tracks ({channel.track_count})</summary>
										<p class="loading-tracks">Loading tracks...</p>
									</details>
								{:else}
									<button
										onclick={() =>
											getChannelTracks(channel.id).then((tracks) => {
												if (tracks.length > 0) {
													channel.track_count = tracks.length
													// Force reactivity
													allChannels = [...allChannels]
												}
											})}
									>
										Check for tracks
									</button>
								{/if}
							{:then tracks}
								{#if tracks.length > 0}
									<details open>
										<summary>Sample tracks ({tracks.length})</summary>
										<Tracklist {tracks} />
									</details>
								{:else if (channel.track_count ?? 0) > 0}
									<p class="no-tracks">
										Track count: {channel.track_count} but no local tracks found.
										<button onclick={() => r5.tracks.pull({slug: channel.slug})}>Pull tracks</button>
									</p>
								{:else}
									<button
										onclick={() =>
											getChannelTracks(channel.id).then((tracks) => {
												if (tracks.length > 0) {
													channel.track_count = tracks.length
													// Force reactivity
													allChannels = [...allChannels]
												}
											})}
									>
										Check for tracks
									</button>
								{/if}
							{:catch error}
								<p class="error-tracks">Error loading tracks: {error.message}</p>
							{/await}
						</div>
					</div>
					<div class="channel-actions">
						<button onclick={() => markToKeep(channel)}>Keep</button>
						<button class="danger" onclick={() => markForDeletion(channel)}>Delete</button>
					</div>
				</div>
			{/each}

			{#if undecidedChannels.length === 0}
				<p>No more channels to review!</p>
			{/if}
		</section>

		{#if deleteChannels.length > 0}
			<details>
				<summary>Marked for Deletion ({deleteChannels.length})</summary>
				{#each deleteChannels as channel (channel.id)}
					<div class="decided">
						{channel.name} ({channel.slug})
						<button onclick={() => undoDecision(channel)}>undo</button>
					</div>
				{/each}
			</details>
		{/if}

		{#if keepChannels.length > 0}
			<details>
				<summary>Marked to Keep ({keepChannels.length})</summary>
				{#each keepChannels as channel (channel.id)}
					<div class="decided">
						{channel.name} ({channel.slug})
						<button onclick={() => undoDecision(channel)}>undo</button>
					</div>
				{/each}
			</details>
		{/if}
	{/if}
</main>

<style>
	main {
		padding: 0.5rem;
	}

	.sql-output {
		width: 100%;
		height: 8rem;
		font-family: var(--monospace);
		padding: 0.5rem;
	}

	.channel {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 0.5rem;
		border-bottom: 1px solid #eee;
	}

	.channel-avatar {
		flex-shrink: 0;
		width: 4rem;
		height: 4rem;
	}

	.channel-content {
		flex: 1;
		min-width: 0;
	}

	.channel-actions {
		min-width: 120px;
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.description {
		margin-top: 0.2rem;
		font-style: italic;
	}

	.decided {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.2rem;
	}

	.controls {
		display: flex;
		gap: 2rem;
	}

	.controls label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.batch-controls {
		margin: 1rem 0;
		display: flex;
		align-items: center;
		gap: 1rem;
	}
</style>
