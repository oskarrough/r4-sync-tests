<script>
	import {onMount} from 'svelte'
	import {page} from '$app/state'
	import Icon from '$lib/components/icon.svelte'
	import {pg} from '$lib/r5/db'
	import {extractHashtags} from '$lib/utils.ts'
	import * as m from '$lib/paraglide/messages'
	import {getLocale} from '$lib/paraglide/runtime'

	let stats = $state({
		totalPlays: 0,
		totalListeningTime: 0,
		uniqueTracks: 0,
		uniqueChannels: 0,
		topTags: [],
		topChannels: [],
		temporalPatterns: null,
		skipRate: 0,
		// DB stats
		totalChannelsInDb: 0,
		totalTracksInDb: 0,
		tracksWithoutMeta: 0,
		avgTracksPerChannel: 0,
		channelTimeline: [],
		recentlyPlayed: [],
		// Track stats
		mostReplayedTrack: null,
		// Patterns
		daysSinceFirstPlay: 0,
		streakDays: 0,
		mostActiveHour: null,
		// Reason analytics
		startReasons: [],
		endReasons: [],
		userInitiatedRate: 0
	})

	let ready = $state(false)

	onMount(async () => {
		await generateStats()
		ready = true
	})

	async function generateStats() {
		try {
			// Load core data with simple queries
			const [playHistory, channels, tracks] = await Promise.all([
				pg.sql`
					SELECT 
						ph.*,
						twm.title, twm.duration, twm.description,
						twm.channel_id,
						c.name as channel_name, c.slug as slug
					FROM play_history ph
					JOIN tracks_with_meta twm ON ph.track_id = twm.id
					JOIN channels c ON twm.channel_id = c.id
				`,
				pg.sql`SELECT * FROM channels`,
				pg.sql`SELECT * FROM tracks_with_meta`
			])

			const plays = playHistory.rows

			// Basic stats
			stats.totalPlays = plays.length
			stats.totalListeningTime = Math.round(plays.reduce((sum, p) => sum + p.ms_played, 0) / 1000 / 60)
			stats.uniqueTracks = new Set(plays.map((p) => p.track_id)).size
			stats.uniqueChannels = new Set(plays.map((p) => p.channel_id)).size
			stats.skipRate = Math.round((plays.filter((p) => p.skipped).length / plays.length) * 100)

			// Channel stats
			const channelPlays = {}
			plays.forEach((play) => {
				if (!channelPlays[play.channel_id]) {
					channelPlays[play.channel_id] = {
						id: play.channel_id,
						name: play.channel_name,
						slug: play.slug,
						plays: 0,
						total_listening_ms: 0,
						completions: []
					}
				}
				const ch = channelPlays[play.channel_id]
				ch.plays++
				ch.total_listening_ms += play.ms_played
				if (play.duration > 0) {
					ch.completions.push(play.ms_played / play.duration)
				}
			})

			stats.topChannels = Object.values(channelPlays)
				.sort((a, b) => b.plays - a.plays)
				.slice(0, 8)
				.map((ch) => ({
					...ch,
					completion_rate:
						ch.completions.length > 0
							? Math.round((ch.completions.reduce((a, b) => a + b, 0) / ch.completions.length) * 100)
							: 0
				}))

			// Extract hashtags
			const allTags = plays
				.filter((p) => p.description)
				.flatMap((p) => extractHashtags(p.description))
				.reduce((acc, tag) => {
					acc[tag] = (acc[tag] || 0) + 1
					return acc
				}, {})

			stats.topTags = Object.entries(allTags)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 20)
				.map(([tag, count]) => ({tag, count}))

			// Database stats
			stats.totalChannelsInDb = channels.rows.length
			stats.totalTracksInDb = tracks.rows.length
			stats.tracksWithoutMeta = tracks.rows.filter((t) => !t.duration || !t.title).length

			// Average tracks per channel
			const tracksByChannel = {}
			tracks.rows.forEach((t) => {
				tracksByChannel[t.channel_id] = (tracksByChannel[t.channel_id] || 0) + 1
			})
			const trackCounts = Object.values(tracksByChannel)
			stats.avgTracksPerChannel =
				trackCounts.length > 0 ? Math.round((trackCounts.reduce((a, b) => a + b, 0) / trackCounts.length) * 10) / 10 : 0

			// Channel timeline
			const monthlyChannels = {}
			channels.rows
				.filter((c) => c.created_at)
				.forEach((c) => {
					const createdAt = new Date(c.created_at)
					const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-01`
					monthlyChannels[monthKey] = (monthlyChannels[monthKey] || 0) + 1
				})

			stats.channelTimeline = Object.entries(monthlyChannels)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([month, count]) => ({month, count}))

			// Recently played (unique tracks from last 7 days)
			const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000
			const recentTracks = {}
			plays
				.filter((p) => new Date(p.started_at).getTime() > sevenDaysAgoMs)
				.forEach((p) => {
					const playTime = new Date(p.started_at).getTime()
					const existingTime = recentTracks[p.track_id] ? new Date(recentTracks[p.track_id].started_at).getTime() : 0
					if (!recentTracks[p.track_id] || playTime > existingTime) {
						recentTracks[p.track_id] = {
							id: p.track_id,
							title: p.title,
							channel_name: p.channel_name,
							slug: p.slug,
							started_at: p.started_at
						}
					}
				})
			stats.recentlyPlayed = Object.values(recentTracks)
				.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
				.slice(0, 3)

			// Most replayed tracks (top 3)
			const trackPlays = {}
			plays.forEach((p) => {
				const key = p.track_id
				if (!trackPlays[key]) {
					trackPlays[key] = {
						title: p.title,
						channel_name: p.channel_name,
						slug: p.slug,
						track_id: p.track_id,
						play_count: 0
					}
				}
				trackPlays[key].play_count++
			})
			stats.mostReplayedTrack = Object.values(trackPlays)
				.sort((a, b) => b.play_count - a.play_count)
				.slice(0, 3)

			// Listening streak and patterns
			if (plays.length > 0) {
				const dates = plays.map((p) => new Date(p.started_at).toDateString())
				const uniqueDays = new Set(dates)
				const playTimes = plays.map((p) => new Date(p.started_at).getTime())
				const firstPlayMs = Math.min(...playTimes)
				const daysSince = Math.floor((Date.now() - firstPlayMs) / (1000 * 60 * 60 * 24))
				stats.daysSinceFirstPlay = daysSince
				stats.streakDays = uniqueDays.size

				// Most active hour
				const hourCounts = {}
				plays.forEach((p) => {
					const hour = new Date(p.started_at).getHours()
					hourCounts[hour] = (hourCounts[hour] || 0) + 1
				})
				const sortedHours = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)
				if (sortedHours.length > 0) {
					stats.mostActiveHour = Number(sortedHours[0][0])
				}

				// Temporal patterns
				const patterns = {}
				plays.forEach((p) => {
					const playDate = new Date(p.started_at)
					const hour = playDate.getHours()
					const dow = playDate.getDay()
					const key = `${hour}-${dow}`
					if (!patterns[key]) {
						patterns[key] = {
							hour,
							day_of_week: dow,
							plays: 0,
							completions: []
						}
					}
					patterns[key].plays++
					if (p.duration > 0) {
						patterns[key].completions.push(p.ms_played / p.duration)
					}
				})
				stats.temporalPatterns = Object.values(patterns)
					.map((p) => ({
						...p,
						avg_completion:
							p.completions.length > 0 ? p.completions.reduce((a, b) => a + b, 0) / p.completions.length : 0
					}))
					.sort((a, b) => b.plays - a.plays)

				// Reason analytics
				const startReasons = {}
				const endReasons = {}
				plays.forEach((p) => {
					if (p.reason_start) {
						startReasons[p.reason_start] = (startReasons[p.reason_start] || 0) + 1
					}
					if (p.reason_end) {
						endReasons[p.reason_end] = (endReasons[p.reason_end] || 0) + 1
					}
				})
				stats.startReasons = Object.entries(startReasons)
					.sort(([, a], [, b]) => b - a)
					.map(([reason, count]) => ({reason, count}))
				stats.endReasons = Object.entries(endReasons)
					.sort(([, a], [, b]) => b - a)
					.map(([reason, count]) => ({reason, count}))

				// User vs auto listening
				const userInitiated = plays.filter((p) =>
					['user_click_track', 'user_next', 'user_prev', 'play_channel', 'play_search'].includes(p.reason_start)
				).length
				stats.userInitiatedRate = Math.round((userInitiated / plays.length) * 100)
			}
		} catch (err) {
			console.error('Stats generation failed:', err)
		}
	}
</script>

<svelte:head>
	<title>{m.page_title_stats()}</title>
</svelte:head>

<article class="SmallContainer">
	<menu>
		<a class="btn" href="/stats" class:active={page.route.id === '/stats'}>
			<Icon icon="chart-scatter" size={20} />
			{m.nav_stats()}
		</a>
		<a class="btn" href="/history" class:active={page.route.id === '/history'}>
			<Icon icon="history" size={20} />
			{m.nav_history()}
		</a>
	</menu>

	<header>
		<h1>{m.stats_heading()}</h1>
		<p>{m.stats_intro()}</p>
	</header>

	{#if !ready}
		<section>
			<header>
				<h2>{m.stats_loading_heading()}</h2>
			</header>
		</section>
	{:else}
		<section>
			<header>
				<h2>{m.stats_activity_heading()}</h2>
			</header>

			<p>
				{m.stats_counts_summary({
					channels: stats.uniqueChannels.toLocaleString(),
					tracks: stats.uniqueTracks.toLocaleString(),
					plays: stats.totalPlays.toLocaleString()
				})}
			</p>

			<p>
				{m.stats_time_summary({
					hours: Math.floor(stats.totalListeningTime / 60),
					minutes: stats.totalListeningTime % 60,
					skipRate: stats.skipRate
				})}
			</p>

			{#if stats.daysSinceFirstPlay > 0}
				<p>
					{m.stats_listening_duration({
						days: stats.daysSinceFirstPlay,
						activeDays: stats.streakDays
					})}
				</p>
			{/if}

			{#if stats.mostActiveHour !== null}
				<p>{m.stats_most_active({hour: stats.mostActiveHour})}</p>
			{/if}

			{#if stats.userInitiatedRate > 0}
				<p>
					{m.stats_user_share({
						userRate: stats.userInitiatedRate,
						autoRate: 100 - stats.userInitiatedRate
					})}
				</p>
			{/if}
		</section>

		{#if stats.mostReplayedTrack.length > 0}
			<section>
				<header>
					<h2>{m.stats_on_repeat_heading()}</h2>
				</header>
				<ol>
					{#each stats.mostReplayedTrack as track (track.track_id)}
						<li>
							<a href="/{track.slug}">@{track.slug}</a>
							&rarr;
							<a href={`/${track.slug}/${track.track_id}`}>
								<em>{track.title}</em>
							</a>
							• {m.stats_play_count({count: track.play_count})}
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		{#if stats.recentlyPlayed.length > 0}
			<section>
				<header>
					<h2>{m.stats_recent_heading()}</h2>
				</header>
				<ol>
					{#each stats.recentlyPlayed as track (track.id)}
						<li>
							<a href="/{track.slug}">@{track.slug}</a>
							&rarr;
							<a href={`/${track.slug}/${track.id}`}>
								<em>{track.title}</em>
							</a>
						</li>
					{/each}
				</ol>
				<p style="text-align:right"><a href="/history">{m.stats_history_link()}</a></p>
			</section>
		{/if}

		{#if stats.startReasons.length > 0}
			<section>
				<div class="reasons">
					<div>
						<header>
							<h2>{m.stats_play_reasons_heading()}</h2>
						</header>
						{#each stats.startReasons.slice(0, 5) as { reason, count } (reason)}
							<div class="reason-line">
								{reason}
								{count}
							</div>
						{/each}
					</div>
					<div>
						<header>
							<h2>{m.stats_stop_reasons_heading()}</h2>
						</header>
						{#each stats.endReasons.slice(0, 5) as { reason, count } (reason)}
							<div class="reason-line">
								{reason}
								{count}
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<section>
			<header>
				<h2>{m.stats_database_heading()}</h2>
			</header>
			<p>
				{m.stats_database_summary({
					channels: stats.totalChannelsInDb.toLocaleString(),
					tracks: stats.totalTracksInDb.toLocaleString()
				})}
				<small>{m.stats_database_local_hint()}</small>
			</p>
			<p>
				{m.stats_database_tracks_per_channel({average: stats.avgTracksPerChannel})}
			</p>
			<p>
				{m.stats_database_metadata_summary({
					count: (stats.totalTracksInDb - stats.tracksWithoutMeta).toLocaleString()
				})}
			</p>
		</section>

		{#if stats.channelTimeline.length > 1}
			{@const max = Math.max(...stats.channelTimeline.map((m) => m.count))}
			<section>
				<div class="timeline">
					{#each stats.channelTimeline as month, i (i)}
						{@const dateLabel = new Intl.DateTimeFormat(getLocale() ?? 'en', {
							month: 'short',
							year: 'numeric'
						}).format(new Date(month.month))}
						<div
							class="bar"
							style="height: {(month.count / max) * 100}%"
							title={m.stats_timeline_tooltip({
								date: dateLabel,
								count: month.count
							})}
						></div>
					{/each}
				</div>
				<header>
					<h2 style="text-align:right">
						{m.stats_timeline_heading({count: stats.totalChannelsInDb.toLocaleString()})}
					</h2>
				</header>
			</section>
			<br />
		{/if}
	{/if}
</article>

<style>
	article {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	section {
		p,
		ol {
			margin: 0 0.5rem;
		}
		ol {
			margin: 0 0.5rem;
			padding-left: 1rem;
		}
	}

	section header {
		border-bottom: 1px solid var(--gray-5);

		h2 {
			text-transform: uppercase;
		}
	}

	.timeline {
		display: flex;
		align-items: flex-end;
		height: 60px;
		gap: 2px;
		padding: 0.5rem;

		.bar {
			flex: 1;
			background: var(--accent-9);
			min-height: 2px;
			transition:
				height 200ms,
				opacity 0.2s;

			&:hover {
				height: 0 !important;
			}
		}
	}

	.reasons {
		display: flex;
		gap: 0rem;
		padding: 0rem;
	}

	.reason-line {
		display: flex;
		justify-content: space-between;
		min-width: 12em;
	}
</style>
