<script>
	import {goto} from '$app/navigation'
	import {page} from '$app/state'
	import {appState} from '$lib/app-state.svelte'
	import {r5} from '$lib/r5'
	import {pg} from '$lib/r5/db'
	import * as m from '$lib/paraglide/messages'

	const url = $derived(page?.url?.searchParams?.get('url'))
	const channelId = $derived(appState.channels?.length > 0 ? appState.channels[0] : undefined)
	const isSignedIn = $derived(!!appState.user)
	const canAddTrack = $derived(isSignedIn && channelId)

	const channel = $derived.by(async () => {
		if (!channelId) return null
		return (await pg.sql`select * from channels where id = ${channelId}`).rows[0]
	})

	async function handleSubmit(event) {
		const track = event.detail.data

		try {
			const channelData = await channel
			if (channelData) {
				await r5.tracks.insert(channelData.slug, [track])
				goto(`/${channelData.slug}`)
			}
		} catch (error) {
			console.error('Failed to insert track:', error)
		}
	}
</script>

<svelte:head>
	<title>{m.page_title_add_track()}</title>
</svelte:head>

{#if canAddTrack}
	<h2>
		{m.track_add_title()}
		{#await channel then channelData}
			{#if channelData}
				<a href={`/${channelData.slug}`}>{m.track_add_destination({channel: channelData.name})}</a>
			{/if}
		{/await}
	</h2>

	<r4-track-create channel_id={channelId} {url} onsubmit={handleSubmit}></r4-track-create>
{:else}
	<p><a href="/auth">{m.auth_sign_in_to_add()}</a></p>
{/if}
