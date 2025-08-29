<script>
	import {onMount} from 'svelte'
	import {pg} from '$lib/r5/db'
	import {extractHashtags} from '$lib/utils.ts'

	let stats = $state({
		totalPlays: 0,
		totalListeningTime: 0,
		uniqueTracks: 0,
		uniqueChannels: 0,
		topTags: [],
		topChannels: [],
		listeningHabits: '',
		temporalPatterns: null,
		skipRate: 0,
		// DB stats
		totalChannelsInDb: 0,
		totalTracksInDb: 0,
		tracksWithoutMeta: 0,
		avgTracksPerChannel: 0,
		newestChannel: null,
		oldestChannel: null
	})

	onMount(async () => {
		await generateStats()
	})

	async function generateStats() {
		try {
			// Basic stats using tracks_with_meta view
			const playsResult = await pg.sql`
				SELECT
					COUNT(*) as total_plays,
					SUM(ph.ms_played) as total_ms,
					COUNT(DISTINCT ph.track_id) as unique_tracks,
					AVG(CASE WHEN ph.skipped THEN 1 ELSE 0 END) as skip_rate,
					COUNT(DISTINCT twm.channel_id) as unique_channels,
					AVG(twm.duration) as avg_track_duration
				FROM play_history ph
				JOIN tracks_with_meta twm ON ph.track_id = twm.id
			`

			// Channel loyalty with better stats
			const channelStats = await pg.sql`
				SELECT
					c.name,
					c.slug,
					COUNT(*) as plays,
					SUM(ph.ms_played) as total_listening_ms,
					AVG(ph.ms_played::float / NULLIF(twm.duration, 0)) as completion_rate
				FROM play_history ph
				JOIN tracks_with_meta twm ON ph.track_id = twm.id
				JOIN channels c ON twm.channel_id = c.id
				GROUP BY c.id, c.name, c.slug
				ORDER BY plays DESC
				LIMIT 8
			`

			// Extract hashtags from track descriptions with meta
			const hashtagsResult = await pg.sql`
				SELECT twm.description
				FROM play_history ph
				JOIN tracks_with_meta twm ON ph.track_id = twm.id
				WHERE twm.description IS NOT NULL
			`

			// Temporal patterns with completion data
			const temporalResult = await pg.sql`
				SELECT
					EXTRACT(hour FROM ph.started_at) as hour,
					EXTRACT(dow FROM ph.started_at) as day_of_week,
					COUNT(*) as plays,
					AVG(ph.ms_played::float / NULLIF(twm.duration, 0)) as avg_completion
				FROM play_history ph
				JOIN tracks_with_meta twm ON ph.track_id = twm.id
				GROUP BY EXTRACT(hour FROM ph.started_at), EXTRACT(dow FROM ph.started_at)
				ORDER BY plays DESC
			`

			const play = playsResult.rows[0]
			stats.totalPlays = Number(play.total_plays)
			stats.totalListeningTime = Math.round(play.total_ms / 1000 / 60) // minutes
			stats.uniqueTracks = Number(play.unique_tracks)
			stats.uniqueChannels = Number(play.unique_channels)
			stats.skipRate = Math.round(play.skip_rate * 100)
			stats.topChannels = channelStats.rows.map((row) => ({
				...row,
				completion_rate: Math.round(row.completion_rate * 100)
			}))

			// Extract hashtags
			const allTags = hashtagsResult.rows
				.flatMap((row) => extractHashtags(row.description))
				.reduce((acc, tag) => {
					acc[tag] = (acc[tag] || 0) + 1
					return acc
				}, {})

			stats.topTags = Object.entries(allTags)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 20)
				.map(([tag, count]) => ({tag, count}))

			// Database stats
			const dbStats = await pg.sql`
				SELECT
					(SELECT COUNT(*) FROM channels) as total_channels,
					(SELECT COUNT(*) FROM tracks) as total_tracks,
					(SELECT COUNT(*) FROM tracks_with_meta WHERE duration IS NULL OR title IS NULL) as tracks_without_meta,
					(SELECT ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM channels WHERE (SELECT COUNT(*) FROM tracks WHERE channel_id = channels.id) > 0), 1)) as avg_tracks_per_channel
			`

			const channelAges = await pg.sql`
				SELECT name, slug, created_at
				FROM channels
				WHERE created_at IS NOT NULL
				ORDER BY created_at DESC
				LIMIT 1
			`

			const oldestChannel = await pg.sql`
				SELECT name, slug, created_at
				FROM channels
				WHERE created_at IS NOT NULL
				ORDER BY created_at ASC
				LIMIT 1
			`

			const dbRow = dbStats.rows[0]
			stats.totalChannelsInDb = Number(dbRow.total_channels)
			stats.totalTracksInDb = Number(dbRow.total_tracks)
			stats.tracksWithoutMeta = Number(dbRow.tracks_without_meta)
			stats.avgTracksPerChannel = Number(dbRow.avg_tracks_per_channel)
			stats.newestChannel = channelAges.rows[0] || null
			stats.oldestChannel = oldestChannel.rows[0] || null

			// Generate natural language habits
			stats.listeningHabits = generateHabitsText(temporalResult.rows, stats)
			stats.temporalPatterns = temporalResult.rows
		} catch (err) {
			console.error('Stats generation failed:', err)
		}
	}

	function generateHabitsText(temporal, stats) {
		const total = stats.totalPlays
		if (total < 10) return 'not enough data yet'

		// Find peak hours
		const hourCounts = temporal.reduce((acc, row) => {
			acc[row.hour] = (acc[row.hour] || 0) + Number(row.plays)
			return acc
		}, {})

		const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]

		const timeOfDay = Number(peakHour[0]) < 12 ? 'morning' : Number(peakHour[0]) < 17 ? 'afternoon' : 'evening'

		const skipBehavior =
			stats.skipRate > 30 ? 'restless skipper' : stats.skipRate < 10 ? 'patient listener' : 'selective'

		const channelLoyalty =
			stats.topChannels[0]?.plays / total > 0.4 ? `devoted to ${stats.topChannels[0]?.name}` : 'channel explorer'

		const avgSession = stats.totalListeningTime / stats.totalPlays
		const sessionStyle = avgSession > 4 ? 'long sessions' : 'quick dips'

		return `${timeOfDay} ${skipBehavior}, ${channelLoyalty}, prefers ${sessionStyle}`
	}
</script>

<svelte:head>
	<title>Stats - R5</title>
</svelte:head>

<article>
	<section>
		<header>
			<h1>listening patterns</h1>
		</header>
		<p>{stats.listeningHabits}</p>

		<p>
			<strong>{stats.totalPlays.toLocaleString()}</strong> total plays across
			<strong>{stats.uniqueTracks.toLocaleString()}</strong>
			unique tracks from <strong>{stats.uniqueChannels.toLocaleString()}</strong> channels.
		</p>

		<p>
			Total listening time: <strong
				>{Math.floor(stats.totalListeningTime / 60)}h {stats.totalListeningTime % 60}m</strong
			>
		</p>

		<p>Skip rate: <strong>{stats.skipRate}%</strong></p>
	</section>

	<section>
		<header>
			<h2>database</h2>
		</header>
		<p>
			<strong>{stats.totalChannelsInDb.toLocaleString()}</strong> channels with
			<strong>{stats.totalTracksInDb.toLocaleString()}</strong> tracks (avg {stats.avgTracksPerChannel} tracks per channel)
		</p>

		{#if stats.tracksWithoutMeta > 0}
			<p><strong>{stats.tracksWithoutMeta.toLocaleString()}</strong> tracks missing metadata</p>
		{/if}

		{#if stats.newestChannel}
			<p>
				newest: <a href="/{stats.newestChannel.slug}">{stats.newestChannel.name}</a>
				<small>({new Date(stats.newestChannel.created_at).toLocaleDateString()})</small>
			</p>
		{/if}

		{#if stats.oldestChannel}
			<p>
				oldest: <a href="/{stats.oldestChannel.slug}">{stats.oldestChannel.name}</a>
				<small>({new Date(stats.oldestChannel.created_at).toLocaleDateString()})</small>
			</p>
		{/if}
	</section>

	{#if stats.topChannels.length > 0}
		<section>
			<header>
				<h2>stations</h2>
			</header>
			<ol>
				{#each stats.topChannels as channel (channel.slug)}
					<li>
						<a href="/{channel.slug}">{channel.name}</a>
						<small>({channel.plays} plays, {channel.completion_rate}% completion)</small>
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	{#if stats.topTags.length > 0}
		<section>
			<header>
				<h2>tags</h2>
			</header>
			<div class="tag-cloud">
				{#each stats.topTags as { tag, count } (tag)}
					<a
						href="/search?search={encodeURIComponent(tag)}"
						class="tag"
						style="font-size: {Math.min(2, 0.8 + count / 10)}em; opacity: {Math.min(1, 0.4 + count / 20)}">{tag}</a
					>
				{/each}
			</div>
		</section>
	{/if}
</article>

<style>
	article {
		margin: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}
</style>
