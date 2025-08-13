<script>
	let {data} = $props()
</script>

<svelte:head>
	<title>Track URLs - {data.channel?.name || 'Channel'} - R5</title>
</svelte:head>

<pre>{data.trackUrls.join('\n')}</pre>
