<script>
	import {joinBroadcast, leaveBroadcast} from '$lib/broadcast'
	import {appState} from '$lib/app-state.svelte'
	import ChannelAvatar from './channel-avatar.svelte'

	/** @type {import('$lib/types').BroadcastWithChannel[]} */
	export let broadcasts = []
</script>

{#if broadcasts.length > 0}
	<div class="live-broadcasts">
		<a href="/broadcasts" class="broadcasts-link">
			{broadcasts.length} broadcasting
		</a>
		{#each broadcasts.slice(0, 3) as broadcast (broadcast.channel_id)}
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
