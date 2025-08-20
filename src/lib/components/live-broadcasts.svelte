<script>
	import {sdk} from '@radio4000/sdk'
	import {joinBroadcast, leaveBroadcast, syncLocalBroadcastState} from '$lib/broadcast'
	import {r4} from '$lib/r4'
	import {appState} from '$lib/app-state.svelte'
	import ChannelAvatar from './channel-avatar.svelte'
	import {logger} from '$lib/logger'
	const log = logger.ns('live-broadcasts').seal()

	/** @type {import('$lib/types').BroadcastWithChannel[]} */
	let activeBroadcasts = $state([])
	let subscriptionStatus = $state('disconnected')

	async function loadBroadcasts() {
		try {
			const data = await r4.broadcasts.readBroadcastsWithChannel()
			activeBroadcasts = data
			syncLocalBroadcastState(data, appState.channels?.[0])
		} catch (error) {
			log.error('load_broadcasts_failed', {error: /** @type {Error} */ (error).message})
		}
	}

	$effect(() => {
		loadBroadcasts()

		const broadcastChannel = sdk.supabase
			.channel('live-broadcasts')
			.on(
				'postgres_changes',
				{event: '*', schema: 'public', table: 'broadcast'},
				async (payload) => {
					const channelId = payload.new?.channel_id || payload.old?.channel_id
					log.log('realtime_event', {
						event: payload.eventType,
						channel_id: channelId,
						track_id: payload.new?.track_id,
						old_track_id: payload.old?.track_id
					})

					if (payload.eventType === 'DELETE' && channelId) {
						activeBroadcasts = activeBroadcasts.filter((b) => b.channel_id !== channelId)
						log.log('broadcast_removed_from_ui', {channel_id: channelId})
						return
					}

					await loadBroadcasts()
				}
			)
			.subscribe((status) => {
				subscriptionStatus = status
				log.log('subscription_status_changed', {status})
			})

		return () => broadcastChannel.unsubscribe()
	})
</script>

{#if activeBroadcasts.length > 0}
	<div class="live-broadcasts">
		<a href="/broadcasts" class="broadcasts-link">
			{activeBroadcasts.length} broadcasting
		</a>
		{#each activeBroadcasts.slice(0, 3) as broadcast (broadcast.channel_id)}
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
