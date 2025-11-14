<script>
	import {onMount} from 'svelte'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import {r5} from '$lib/r5'
	import {pg} from '$lib/r5/db'
	import {analyzeChannel, analyzeChannels, clearChannelSpam, getChannelTracks} from './spam-detector.js'
	import * as m from '$lib/paraglide/messages'

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

	const filterLabels = {
		highConfidenceSpam: () => m.spam_filter_high(),
		needsReview: () => m.spam_filter_needs(),
		all: () => m.spam_filter_all()
	}

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
		alert(m.spam_alert_sql_copied())
	}

	/** @param {typeof channels[0]} channel */
	async function undoDecision(channel) {
		channel.spam = undefined
		await clearChannelSpam(channel.id)
	}

	async function clearAllSelections() {
		if (!confirm(m.spam_confirm_clear())) {
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

			alert(m.spam_alert_cleared())
		} catch (error) {
			console.error('Failed to clear selections:', error)
			alert(m.spam_alert_clear_failed())
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
			alert(m.spam_alert_no_channels())
			return
		}

		if (!confirm(m.spam_confirm_fetch({count: channelsWithoutTracks.length}))) {
			return
		}

		batchFetching = true
		batchProgress = `⚙️ ${m.spam_progress_fetching({count: channelsWithoutTracks.length})}`

		try {
			for (let i = 0; i < channelsWithoutTracks.length; i++) {
				const channel = channelsWithoutTracks[i]
				batchProgress = `⚙️ ${m.spam_progress_item({
					current: i + 1,
					total: channelsWithoutTracks.length,
					name: channel.name
				})}`

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
			batchProgress = `✅ ${m.spam_progress_done({count: channelsWithoutTracks.length})}`

			setTimeout(() => {
				batchProgress = ''
			}, 3000)
		} catch (error) {
			console.error('Batch fetch error:', error)
			batchProgress = `❌ ${m.spam_progress_failed({
				message: error instanceof Error ? error.message : String(error)
			})}`
		} finally {
			batchFetching = false
		}
	}

	const filterDescription = $derived(
		filterMode === 'highConfidenceSpam'
			? filterLabels.highConfidenceSpam()
			: filterMode === 'needsReview'
				? filterLabels.needsReview()
				: filterLabels.all()
	)
</script>

<svelte:head>
	<title>{m.page_title_spam_warrior()}</title>
</svelte:head>

<main>
	<header>
		<h1>{m.spam_heading()}</h1>
		<p>{m.spam_description({filter: filterDescription})}</p>
	</header>

	{#if loading}
		<p>{m.spam_loading()}</p>
	{:else}
		<p>
			{m.spam_summary({
				pending: undecidedChannels.length,
				toDelete: deleteChannels.length,
				toKeep: keepChannels.length
			})}
			<em>
				{m.spam_summary_details({
					filtered: filteredChannels.length,
					total: allChannels.length
				})}
			</em>
		</p>

		<menu class="controls">
			<label>
				<input type="radio" bind:group={filterMode} value="highConfidenceSpam" />
				{m.spam_radio_high()}
			</label>
			<label>
				<input type="radio" bind:group={filterMode} value="needsReview" />
				{m.spam_radio_needs()}
			</label>
		</menu>

		<div class="batch-controls">
			<button onclick={batchFetchTracks} disabled={batchFetching}>
				{batchFetching ? m.spam_button_fetching() : m.spam_button_fetch_all()}
			</button>
			{#if batchProgress}
				<span>{batchProgress}</span>
			{/if}
		</div>

		<menu>
			<button onclick={clearAllSelections} style="background: var(--color-orange)">
				{m.spam_button_clear()}
			</button>
		</menu>

		{#if sqlCommands.length > 0}
			<section>
				<h2>
					{m.spam_section_sql({count: sqlCommands.length})}
					<button onclick={copyAllSQL}>{m.spam_button_copy_sql()}</button>
				</h2>
				<textarea readonly class="sql-output">{sqlCommands.join('\n\n')}</textarea>
			</section>
		{/if}

		<section class="channels">
			<h2>{m.spam_channels_heading({count: undecidedChannels.length})}</h2>

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
								>{m.spam_label_v1()}</span
							>
						{/if}
						<span class="track-count">{m.spam_track_count({count: channel.track_count ?? 0})}</span>
						<em>{m.spam_spam_percent({percent: Math.round(channel.spamAnalysis.confidence * 100)})}</em>
						{#if channel.description && channel.description.trim()}
							<div class="description">
								{channel.description.length > 400 ? channel.description.slice(0, 400) + '...' : channel.description}
							</div>
						{:else}
							<div class="description no-description">
								<em>{m.spam_no_description()}</em>
							</div>
						{/if}
						{#if channel.spamAnalysis.reasons.length > 0}
							<span style="background: var(--color-orange)">{channel.spamAnalysis.reasons.join(', ')}</span>
						{/if}

						<div class="channel-tracks">
							{#await getChannelTracks(channel.id)}
								{#if (channel.track_count ?? 0) > 0}
									<details open>
										<summary>{m.spam_sample_tracks({count: channel.track_count})}</summary>
										<p class="loading-tracks">{m.spam_loading_tracks()}</p>
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
										{m.spam_check_tracks()}
									</button>
								{/if}
							{:then tracks}
								{#if tracks.length > 0}
									<details open>
										<summary>{m.spam_sample_tracks({count: tracks.length})}</summary>
										<Tracklist {tracks} />
									</details>
								{:else if (channel.track_count ?? 0) > 0}
									<p class="no-tracks">
										{m.spam_no_tracks_message({count: channel.track_count})}
										<button onclick={() => r5.tracks.pull({slug: channel.slug})}>{m.spam_button_pull_tracks()}</button>
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
										{m.spam_check_tracks()}
									</button>
								{/if}
							{:catch error}
								<p class="error-tracks">{m.spam_error_tracks({message: error.message})}</p>
							{/await}
						</div>
					</div>
					<div class="channel-actions">
						<button onclick={() => markToKeep(channel)}>{m.spam_button_keep()}</button>
						<button class="danger" onclick={() => markForDeletion(channel)}>{m.spam_button_delete()}</button>
					</div>
				</div>
			{/each}

			{#if undecidedChannels.length === 0}
				<p>{m.spam_empty_state()}</p>
			{/if}
		</section>

		{#if deleteChannels.length > 0}
			<details>
				<summary>{m.spam_marked_delete({count: deleteChannels.length})}</summary>
				{#each deleteChannels as channel (channel.id)}
					<div class="decided">
						{channel.name} ({channel.slug})
						<button onclick={() => undoDecision(channel)}>{m.spam_button_undo()}</button>
					</div>
				{/each}
			</details>
		{/if}

		{#if keepChannels.length > 0}
			<details>
				<summary>{m.spam_marked_keep({count: keepChannels.length})}</summary>
				{#each keepChannels as channel (channel.id)}
					<div class="decided">
						{channel.name} ({channel.slug})
						<button onclick={() => undoDecision(channel)}>{m.spam_button_undo()}</button>
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
