<script>
	import {page} from '$app/stores'
	import {appState} from '$lib/app-state.svelte'
	import {pg} from '$lib/r5/db'
	import * as m from '$lib/paraglide/messages'

	const slug = $derived(page.params.slug)

	const channel = $derived.by(async () => {
		const result = await pg.sql`select * from channels where slug = ${slug}`
		return result.rows[0]
	})

	const isOwner = $derived.by(async () => {
		const channelData = await channel
		return channelData && appState.channels?.includes(channelData.id)
	})
</script>

<svelte:head>
	{#await channel then channelData}
		<title>{m.channel_update_page_title({name: channelData?.name || slug})}</title>
	{/await}
</svelte:head>

{#await Promise.all([channel, isOwner]) then [channelData, ownerCheck]}
	{#if !channelData}
		<p>{m.channel_not_found()}</p>
	{:else if !ownerCheck}
		<p>{m.channel_update_permission()}</p>
	{:else}
		<h1>{m.channel_update_heading({name: channelData.name})}</h1>
		<r4-channel-update channel-id={channelData.id}></r4-channel-update>
	{/if}
{/await}
