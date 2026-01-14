<script>
	import {goto} from '$app/navigation'
	import {appState} from '$lib/app-state.svelte'
	import * as m from '$lib/paraglide/messages'

	let userChannelSlug = $derived(appState.channel?.slug)

	function handleSubmit(event) {
		const {slug} = event.detail
		if (slug) goto(`/${slug}`)
	}
</script>

<article class="MiniContainer center-page">
	{#if !appState.user}
		<p>
			<a href="/auth?redirect=/create-channel">{m.auth_create_or_signin()}</a>
		</p>
		<p>{m.auth_sign_in_to_create()}</p>
	{:else if appState.channels?.length}
		<p>{m.channel_you_have()} <a href="/{userChannelSlug}">{userChannelSlug}</a></p>
	{:else}
		<header>
			<h1>{m.channel_create_prompt()}</h1>
			<p><small>{m.channel_name_changeable()}</small></p>
		</header>
		<r4-channel-create onsubmit={handleSubmit}></r4-channel-create>
	{/if}
</article>
