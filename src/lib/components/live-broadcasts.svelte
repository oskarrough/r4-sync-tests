<script>
	import {sdk} from '@radio4000/sdk'
	import {pg} from '$lib/db'
	import {
		handleBroadcastStateChange,
		handleTrackChange,
		joinBroadcast,
		leaveBroadcast,
		syncPlayBroadcast
	} from '$lib/broadcast'
	import {readBroadcastsWithChannel} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import ChannelAvatar from './channel-avatar.svelte'
	import {logger} from '$lib/logger'
	const log = logger.ns('broadcast').seal()

	/** @type {import('$lib/types').BroadcastWithChannel[]} */
	let activeBroadcasts = $state([])

	// Watch for broadcast state changes
	$effect(() => {
		handleBroadcastStateChange(appState.broadcasting_channel_id, appState.playlist_track)
	})

	// Watch for track changes while broadcasting
	$effect(() => {
		if (appState.broadcasting_channel_id) {
			handleTrackChange(appState.broadcasting_channel_id, appState.playlist_track)
		}
	})

	/**
	 * Set channel.broadcasting on local channels from the remote broadcasts
	 * @param {import('$lib/types').BroadcastWithChannel[]} broadcasts
	 */
	async function updateChannelBroadcastStatus(broadcasts) {
		const broadcastingChannelIds = broadcasts.map((b) => b.channel_id)

		// Reset all channels to not broadcasting
		await pg.sql`UPDATE channels SET broadcasting = false`

		// Set broadcasting channels to true
		if (broadcastingChannelIds.length > 0) {
			await pg.sql`
				UPDATE channels
				SET broadcasting = true
				WHERE id = ANY(${broadcastingChannelIds})
			`
		}

		// Sync local broadcast state: if user's channel is broadcasting remotely, ensure local state matches
		const {rows} =
			await pg.sql`SELECT broadcasting_channel_id, channels FROM app_state WHERE id = 1`
		const state = rows[0]
		const userChannelId = state?.channels?.[0]

		if (userChannelId) {
			const isUserBroadcasting = broadcastingChannelIds.includes(userChannelId)
			const hasLocalBroadcastState = !!state?.broadcasting_channel_id

			if (isUserBroadcasting && !hasLocalBroadcastState) {
				appState.broadcasting_channel_id = userChannelId
				log.log('start', {channelId: userChannelId})
			} else if (!isUserBroadcasting && hasLocalBroadcastState) {
				appState.broadcasting_channel_id = null
				log.log('clear')
			}
		}
	}

	$effect(() => {
		// Initial load.
		readBroadcastsWithChannel().then(async (data) => {
			activeBroadcasts = data
			await updateChannelBroadcastStatus(data)
		})

		// Listen for remote changes.
		const broadcastChannel = sdk.supabase
			.channel('live-broadcasts')
			.on(
				'postgres_changes',
				{event: '*', schema: 'public', table: 'broadcast'},
				async (payload) => {
					log.log('detected_remote_change', payload)

					// If broadcast was deleted, clear listening state for that channel
					if (payload.eventType === 'DELETE' && payload.old?.channel_id) {
						const deletedChannelId = payload.old.channel_id
						const {rows} = await pg.sql`SELECT listening_to_channel_id FROM app_state WHERE id = 1`
						const currentListeningTo = rows[0]?.listening_to_channel_id
						if (currentListeningTo === deletedChannelId) {
							appState.listening_to_channel_id = null
							log.log('clear_listening_state', {channelId: deletedChannelId})
						}
					}

					// If track was updated and we're listening to this channel, sync to new track
					if (
						payload.eventType === 'UPDATE' &&
						payload.new?.track_id &&
						payload.old?.track_id !== payload.new.track_id
					) {
						const {rows} = await pg.sql`SELECT listening_to_channel_id FROM app_state WHERE id = 1`
						const currentListeningTo = rows[0]?.listening_to_channel_id
						if (currentListeningTo === payload.new.channel_id) {
							await syncPlayBroadcast(payload.new)
						}
					}
					activeBroadcasts = await readBroadcastsWithChannel()
					await updateChannelBroadcastStatus(activeBroadcasts)
				}
			)
			.subscribe()

		return () => broadcastChannel.unsubscribe()
	})
</script>

{#if activeBroadcasts.length > 0}
	<div class="live-broadcasts">
		{#each activeBroadcasts as broadcast (broadcast.channel_id)}
			{@const isActive = broadcast.channel_id === appState.listening_to_channel_id}
			<button
				class={[{active: isActive}]}
				onclick={() => {
					if (isActive) {
						leaveBroadcast()
					} else {
						joinBroadcast(broadcast.channel_id)
					}
				}}
			>
				<div class="avatar-container">
					<ChannelAvatar id={broadcast.channels.image} alt={broadcast.channels.name} size={32} />
					<div class="live-dot"></div>
				</div>
				@{broadcast.channels.slug}
			</button>
		{/each}
	</div>
{/if}

<style>
	.live-broadcasts {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		/* font-size: var(--font-3); */
		line-height: 1;
	}

	button {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: 2rem;
		padding-left: 0;
		padding-right: 0.5rem;
	}

	.avatar-container {
		position: relative;
		width: 2rem;
		height: 2rem;
	}

	.avatar-container :global(img) {
		width: 2rem;
		height: 2rem;
		border-radius: var(--border-radius);
		object-fit: cover;
	}

	.live-dot {
		position: absolute;
		top: -3px;
		left: -5px;
		width: var(--font-3);
		height: var(--font-3);
		background-color: #00ff00;
		border: 2px solid white;
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
	}

	button.active {
		background-color: var(--color-lavender);
	}
</style>
