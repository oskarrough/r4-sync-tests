<script>
	import * as m from '$lib/paraglide/messages'

	let {data} = $props()
</script>

<svelte:head>
	<title>{m.track_urls_page_title({name: data.channel?.name || m.channel_page_fallback()})}</title>
</svelte:head>

<pre>{data.trackUrls.join('\n')}</pre>
