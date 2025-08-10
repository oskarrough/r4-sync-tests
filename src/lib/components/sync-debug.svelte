<script>
	import {pg} from '$lib/db'
	import {r5} from '$lib/experimental-api'
	import {pullTrackMetaYouTubeFromChannel} from '$lib/sync/youtube'
	import {incrementalLiveQuery} from '$lib/live-query'
	import SvelteVirtualList from '@humanspeak/svelte-virtual-list'
	import {logger} from '$lib/logger'
	const log = logger.ns('sync-debug').seal()

	/** @type {import('$lib/types').Channel[]} */
	let channels = $state([])

	// Live query for channels with track counts
	$effect(() => {
		log.log('create_live_query')

		return incrementalLiveQuery('SELECT * FROM channels ORDER BY name', [], 'id', (result) => {
			log.log('query_result', result)
			// @ts-expect-error rows are not typed
			channels = result.rows
		})
	})

	/** * @param {string} id */
	async function deleteChannel(id) {
		await pg.sql`DELETE FROM channels WHERE id = ${id}`
	}

	/** * @param {string} id */
	async function deleteTracks(id) {
		await pg.sql`DELETE FROM tracks WHERE channel_id = ${id}`
		await pg.sql`UPDATE channels SET tracks_synced_at = NULL WHERE id = ${id}`
	}

	/** @param {string | null} dateStr */
	function formatDate(dateStr) {
		if (!dateStr) return 'Never'
		return new Date(dateStr).toLocaleString()
	}

	/** @param {import('$lib/types').Channel} channel */
	function getStatusIndicator(channel) {
		if (channel.busy) return '🔄'
		if (!channel.tracks_synced_at) return '🟡'
		return '🟢'
	}

	/** @param {import('$lib/types').Channel} channel */
	function getStatusText(channel) {
		if (channel.busy) return 'Syncing...'
		if (!channel.tracks_synced_at) return 'Synced without tracks'
		return 'Synced'
	}

	/** @param {string} channelId */
	async function updateDurations(channelId) {
		await pg.sql`UPDATE channels SET busy = true WHERE id = ${channelId}`
		try {
			await pullTrackMetaYouTubeFromChannel(channelId)
		} catch (error) {
			console.error('Failed to update durations:', error)
		} finally {
			await pg.sql`UPDATE channels SET busy = false WHERE id = ${channelId}`
		}
	}
</script>

<section style="height: 500px">
	<h3>
		Sync debug ({channels.length} channels)
	</h3>

	{#if channels.length === 0}{:else}
		<SvelteVirtualList items={channels} itemsClass="list">
			{#snippet renderItem(channel)}
				<article class="item">
					<p>
						{getStatusIndicator(channel)}
						<span class="version">({channel.firebase_id ? 'v1' : 'v2'})</span>
						<a href={`/${channel.slug}`}>
							@{channel.slug}
							{channel.name}
						</a>
						<br />
						{getStatusText(channel)}
						{#if channel.tracks_synced_at}
							{formatDate(channel.tracks_synced_at)}
						{/if}
					</p>

					<menu>
						<button onclick={() => r5.tracks.pull({slug: channel.slug})}>&darr; Pull tracks</button>
						<button
							onclick={() => updateDurations(channel.id)}
							disabled={channel.busy || !channel.tracks_synced_at}
						>
							{channel.busy ? '⏳' : '⏱️'} &darr; Pull durations
						</button>
						<button onclick={() => deleteTracks(channel.id)} disabled={!channel.tracks_synced_at}>
							&times; Delete tracks
						</button>
						<button onclick={() => deleteChannel(channel.id)} class="danger">
							&times; Delete channel
						</button>
					</menu>
				</article>
			{/snippet}
		</SvelteVirtualList>
	{/if}
</section>

<style>
	.item {
		display: flex;
		align-items: center;
		menu {
			margin-left: auto;
			margin-right: 0.5rem;
		}
	}
</style>
