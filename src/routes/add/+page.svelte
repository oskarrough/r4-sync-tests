<script>
	import {goto} from '$app/navigation'
	import {page} from '$app/state'
	import {appState} from '$lib/app-state.svelte'
	import TrackForm from '$lib/components/track-form.svelte'
	import * as m from '$lib/paraglide/messages'

	const initialUrl = $derived(page?.url?.searchParams?.get('url') || '')
	const channel = $derived(appState.channel)
	const isSignedIn = $derived(!!appState.user)
	const canAddTrack = $derived(isSignedIn && channel)

	/** @param {{data: {url: string, title: string} | null, error: Error | null}} event */
	function handleSubmit(event) {
		const {data, error} = event
		if (error || !data) return
		if (channel) {
			goto(`/${channel.slug}`)
		}
	}
</script>

<svelte:head>
	<title>{m.page_title_add_track()}</title>
</svelte:head>

<div class="constrained">
	{#if canAddTrack && channel}
		<h2>
			{m.track_add_title()}
			<a href={`/${channel.slug}`}>{m.track_add_destination({channel: channel.name})}</a>
		</h2>

		<TrackForm mode="create" {channel} url={initialUrl} onsubmit={handleSubmit} />
	{:else}
		<p><a href="/auth">{m.auth_sign_in_to_add()}</a></p>
	{/if}
</div>
