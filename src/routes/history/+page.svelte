<script>
	import {page} from '$app/state'
	import Icon from '$lib/components/icon.svelte'
	import {formatDate} from '$lib/dates'
	import {pg} from '$lib/r5/db'

	const historyPromise = $derived.by(async () => {
		const result = await pg.sql`SELECT * FROM play_history ORDER BY started_at DESC`
		return result.rows
	})

	const tracksLookup = $derived.by(async () => {
		const history = await historyPromise
		const trackIds = [...new Set(history.map((h) => h.track_id))]
		if (trackIds.length === 0) return new Map()

		console.log('getting', trackIds.length)

		const result = await pg.sql`
			SELECT t.id, t.title, t.url, c.name as channel_name, c.slug as channel_slug
			FROM tracks t
			JOIN channels c ON t.channel_id = c.id
			WHERE t.id = ANY(${trackIds})
		`
		return new Map(result.rows.map((t) => [t.id, t]))
	})
</script>

<svelte:head>
	<title>Play history - R5</title>
</svelte:head>

<article class="SmallContainer">
	<menu>
		<a class="btn" href="/stats" class:active={page.route.id === '/stats'}>
			<Icon icon="chart-scatter" size={20} /> Stats
		</a>
		<a class="btn" href="/history" class:active={page.route.id === '/history'}>
			<Icon icon="history" size={20} /> History
		</a>
	</menu>

	<header>
		<h1>Playback history</h1>
		<p>Note, this data is all local. Only you see it.</p>
	</header>

	{#await Promise.all([historyPromise, tracksLookup])}
		<p>loading...</p>
	{:then [history, tracks]}
		{#if history.length === 0}
			<p>no play history found</p>
		{:else}
			<ul class="list">
				{#each history as play (play.id)}
					<li>
						{@render playRecord(play, tracks.get(play.track_id))}
					</li>
				{/each}
			</ul>
		{/if}
	{:catch error}
		<p>error loading history: {error.message}</p>
	{/await}
</article>

{#snippet playRecord(play, track)}
	<article class="row">
		<header>
			<span class="channel">
				<a href={`/${track.channel_slug}`}>@{track.channel_slug}</a>
			</span>
			<span class="track">
				{#if track}
					<a href={`/${track.channel_slug}/tracks/${track.id}`}>{track.title}</a>
				{:else}
					{play.track_id}
				{/if}
			</span>
		</header>
		<div class="reasons">{play.reason_start || ''} → {play.reason_end || ''}</div>
		<div class="meta">
			<time>
				{formatDate(new Date(play.started_at))}
				{new Date(play.started_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
				{#if play.ms_played}(played {Math.round(play.ms_played / 1000)}s)
				{/if}
			</time>
			{#if play.shuffle}(shuffled){/if}
			{#if play.skipped}(skipped){/if}
		</div>
	</article>
{/snippet}

<style>
	.SmallContainer {
		margin-top: 0.5rem;

		> menu,
		> header {
			margin-bottom: 1rem;
		}
	}

	.row {
		color: var(--gray-9);
		padding: 0.2rem 0;
	}

	a {
		text-decoration: none;
	}

	.channel a {
		background: var(--test-green);
		color: var(--test-white);
	}

	.track a {
		background: var(--test-magenta);
		color: var(--test-yellow);
	}

	.reasons {
		color: var(--gray-11);
	}
</style>
