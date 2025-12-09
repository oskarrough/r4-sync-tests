<script>
	import {page} from '$app/state'
	import {useLiveQuery} from '$lib/tanstack/useLiveQuery.svelte.js'
	import Icon from '$lib/components/icon.svelte'
	import {formatDate} from '$lib/dates'
	import {playHistoryCollection} from '../tanstack/collections'
	import * as m from '$lib/paraglide/messages'

	const historyQuery = useLiveQuery((q) =>
		q.from({history: playHistoryCollection}).orderBy(({history}) => history.started_at, 'desc')
	)

	let history = $derived(historyQuery.data || [])
</script>

<svelte:head>
	<title>{m.page_title_history()}</title>
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
		<h1>{m.history_title()}</h1>
		<p>{m.history_local_note()}</p>
	</header>

	{#if historyQuery.isLoading}
		<p>{m.loading_generic()}</p>
	{:else if history.length === 0}
		<p>{m.history_empty()}</p>
	{:else}
		<ul class="list">
			{#each history as play (play.id)}
				<li>
					{@render playRecord(play)}
				</li>
			{/each}
		</ul>
	{/if}
</article>

{#snippet playRecord(play)}
	<article class="row">
		<header>
			<span class="channel">
				<a href={`/${play.slug}`}>@{play.slug}</a>
			</span>
			<span class="track">
				<a href={`/${play.slug}/tracks/${play.track_id}`}>{play.title}</a>
			</span>
		</header>
		{#if play.reason_start || play.reason_end}
			<div class="reasons">{play.reason_start || ''} → {play.reason_end || ''}</div>
		{/if}
		<div class="meta">
			<time>
				{formatDate(new Date(play.started_at))}
				{new Date(play.started_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
				{#if play.ms_played}
					{m.history_played_duration({seconds: Math.round(play.ms_played / 1000)})}
				{/if}
			</time>
			{#if play.shuffle}{m.history_flag_shuffled()}{/if}
			{#if play.skipped}{m.history_flag_skipped()}{/if}
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
