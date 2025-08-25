<script>
	import {appState} from '$lib/app-state.svelte'
	import Icon from '$lib/components/icon.svelte'

	const {children, context = 'default'} = $props()

	const isSignedIn = $derived(!!appState.user)
	const hasChannel = $derived(appState.channels?.length > 0)

	function handleChannelCreate(event) {
		const channel = event.detail.data
		if (channel) {
			appState.channels = [channel.id]
		}
	}
</script>

{#if isSignedIn && hasChannel}
	{@render children()}
{:else if isSignedIn && !hasChannel}
	<div class="gate">
		<Icon icon="radio" size={24} />
		<h3>Name your radio station</h3>
		<p>Choose a name for your personal radio station.</p>

		<r4-channel-create onsubmit={handleChannelCreate}></r4-channel-create>
	</div>
{:else}
	<div class="gate">
		<Icon icon="user" size={24} />
		{#if context === 'update'}
			<h3>Please sign in to edit this channel</h3>
			<a href="/auth" class="btn">Sign In</a>
		{:else}
			<h3>Start your radio channel</h3>
			<p>Save tracks, follow channels, build your station</p>
			<a href="/auth" class="btn">Continue</a>
		{/if}
	</div>
{/if}

<style>
	.gate {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
		padding: 2rem 1rem;
	}

	.gate h3 {
		margin: 0;
	}

	.gate p {
		margin: 0;
		color: var(--gray-11);
	}

	.gate form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 300px;
	}

	.error {
		color: var(--red-11) !important;
	}
</style>
