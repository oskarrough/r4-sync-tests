<script>
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import Tracklist from '$lib/components/tracklist.svelte'
	import {channelsCollection, tracksCollection, spamDecisionsCollection} from '../../tanstack/collections'
	import {analyzeChannels} from './spam-detector.js'
	import * as m from '$lib/paraglide/messages'

	let filterMode = $state('needsReview')
	let batchFetching = $state(false)
	let batchProgress = $state('')

	const allChannels = $derived(
		analyzeChannels(
			[...channelsCollection.state.values()].map((ch) => ({
				...ch,
				spam: spamDecisionsCollection.get(ch.id)?.spam
			}))
		)
	)

	const highConfidenceSpam = $derived(
		allChannels.filter((ch) => ch.spamAnalysis.confidence > 0.3 && (ch.track_count ?? 0) === 0)
	)

	const filteredChannels = $derived(
		filterMode === 'highConfidenceSpam'
			? highConfidenceSpam
			: filterMode === 'needsReview'
				? allChannels.filter((ch) => !highConfidenceSpam.includes(ch))
				: allChannels
	)

	const undecidedChannels = $derived(filteredChannels.filter((ch) => ch.spam == null))
	const deleteChannels = $derived(filteredChannels.filter((ch) => ch.spam === true))
	const keepChannels = $derived(filteredChannels.filter((ch) => ch.spam === false))

	const sqlCommands = $derived(
		deleteChannels.map(
			(ch) => `-- Delete channel: ${ch.name} (${ch.slug})
DELETE FROM channel_track WHERE channel_id = '${ch.id}';
DELETE FROM channels WHERE id = '${ch.id}';`
		)
	)

	const filterDescription = $derived(
		filterMode === 'highConfidenceSpam'
			? m.spam_filter_high()
			: filterMode === 'needsReview'
				? m.spam_filter_needs()
				: m.spam_filter_all()
	)

	function getChannelTracks(channelId, limit = 2) {
		return [...tracksCollection.state.values()]
			.filter((t) => t.channel_id === channelId)
			.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
			.slice(0, limit)
	}

	function fetchTracks(slug) {
		return tracksCollection.loadSubset({filters: [{field: ['slug'], operator: 'eq', value: slug}]})
	}

	function setSpamDecision(channel, spam) {
		if (spam === undefined) {
			spamDecisionsCollection.delete(channel.id)
		} else {
			spamDecisionsCollection.insert({channelId: channel.id, spam})
		}
	}

	function copyAllSQL() {
		navigator.clipboard.writeText(sqlCommands.join('\n\n'))
		alert(m.spam_alert_sql_copied())
	}

	function clearAllSelections() {
		if (!confirm(m.spam_confirm_clear())) return
		for (const id of spamDecisionsCollection.state.keys()) {
			spamDecisionsCollection.delete(id)
		}
		alert(m.spam_alert_cleared())
	}

	async function batchFetchTracks() {
		const channelsNeedingTracks = filteredChannels.filter((ch) => getChannelTracks(ch.id).length === 0)

		if (channelsNeedingTracks.length === 0) {
			alert(m.spam_alert_no_channels())
			return
		}
		if (!confirm(m.spam_confirm_fetch({count: channelsNeedingTracks.length}))) return

		batchFetching = true
		batchProgress = `⚙️ ${m.spam_progress_fetching({count: channelsNeedingTracks.length})}`

		for (let i = 0; i < channelsNeedingTracks.length; i++) {
			const channel = channelsNeedingTracks[i]
			batchProgress = `⚙️ ${m.spam_progress_item({current: i + 1, total: channelsNeedingTracks.length, name: channel.name})}`
			try {
				await fetchTracks(channel.slug)
			} catch (err) {
				console.error(`batch_fetch_tracks_error: ${channel.slug}:`, err)
			}
		}

		batchProgress = `✅ ${m.spam_progress_done({count: channelsNeedingTracks.length})}`
		setTimeout(() => (batchProgress = ''), 3000)
		batchFetching = false
	}
</script>

<svelte:head>
	<title>{m.page_title_spam_warrior()}</title>
</svelte:head>

<main>
	<header>
		<h1>{m.spam_heading()}</h1>
		<p>{m.spam_description({filter: filterDescription})}</p>
	</header>

	{#if allChannels.length === 0}
		<p>{m.spam_loading()}</p>
	{:else}
		<p>
			{m.spam_summary({
				pending: undecidedChannels.length,
				toDelete: deleteChannels.length,
				toKeep: keepChannels.length
			})}
			<em>{m.spam_summary_details({filtered: filteredChannels.length, total: allChannels.length})}</em>
		</p>

		<menu class="controls">
			<label><input type="radio" bind:group={filterMode} value="highConfidenceSpam" /> {m.spam_radio_high()}</label>
			<label><input type="radio" bind:group={filterMode} value="needsReview" /> {m.spam_radio_needs()}</label>
		</menu>

		<div class="batch-controls">
			<button onclick={batchFetchTracks} disabled={batchFetching}>
				{batchFetching ? m.spam_button_fetching() : m.spam_button_fetch_all()}
			</button>
			{#if batchProgress}<span>{batchProgress}</span>{/if}
		</div>

		<menu>
			<button onclick={clearAllSelections} style="background: var(--color-orange)">{m.spam_button_clear()}</button>
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
				{@const tracks = getChannelTracks(channel.id)}
				<div class="channel">
					<ChannelAvatar id={channel.image} alt={channel.name} size={64} />
					<div class="channel-content">
						<strong><a href="/{channel.slug}">{channel.name}</a></strong> (@{channel.slug})
						{#if channel.source === 'v1'}
							<span class="badge v1">{m.spam_label_v1()}</span>
						{/if}
						<span class="track-count">{m.spam_track_count({count: channel.track_count ?? 0})}</span>
						<em>{m.spam_spam_percent({percent: Math.round(channel.spamAnalysis.confidence * 100)})}</em>
						<div class="description">
							{#if channel.description?.trim()}
								{channel.description.length > 400 ? channel.description.slice(0, 400) + '...' : channel.description}
							{:else}
								<em>{m.spam_no_description()}</em>
							{/if}
						</div>
						{#if channel.spamAnalysis.reasons.length > 0}
							<span class="reasons">{channel.spamAnalysis.reasons.join(', ')}</span>
						{/if}

						<div class="channel-tracks">
							{#if tracks.length > 0}
								<details open>
									<summary>{m.spam_sample_tracks({count: tracks.length})}</summary>
									<Tracklist {tracks} />
								</details>
							{:else if (channel.track_count ?? 0) > 0}
								<p>
									{m.spam_no_tracks_message({count: channel.track_count})}
									<button onclick={() => fetchTracks(channel.slug)}>{m.spam_button_pull_tracks()}</button>
								</p>
							{:else}
								<button onclick={() => fetchTracks(channel.slug)}>{m.spam_check_tracks()}</button>
							{/if}
						</div>
					</div>
					<div class="channel-actions">
						<button onclick={() => setSpamDecision(channel, false)}>{m.spam_button_keep()}</button>
						<button class="danger" onclick={() => setSpamDecision(channel, true)}>{m.spam_button_delete()}</button>
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
						<button onclick={() => setSpamDecision(channel, undefined)}>{m.spam_button_undo()}</button>
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
						<button onclick={() => setSpamDecision(channel, undefined)}>{m.spam_button_undo()}</button>
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
	.channel-content {
		flex: 1;
		min-width: 0;
	}
	.channel-actions {
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
	.badge.v1 {
		background: var(--color-blue);
		color: white;
		padding: 0.1rem 0.3rem;
		border-radius: 0.2rem;
		font-size: 0.7rem;
	}
	.reasons {
		background: var(--color-orange);
	}
</style>
