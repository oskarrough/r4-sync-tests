<script>
	import {goto} from '$app/navigation'
	import IconR4 from '$lib/icon-r4.svelte'
	import {appState} from '$lib/app-state.svelte'
	import {sdk} from '@radio4000/sdk'

	function handleSubmit(event) {
		goto(`/${event.data.slug}`)
	}
</script>

<section>
	<header>
		<p>To create a new Radio4000 channel, choose a name.</p>
		<p><i>(The name can be changed later)</i></p>
	</header>
	<r4-channel-create onsubmit={handleSubmit}></r4-channel-create>
</section>

<section>
	<dialog open inline>
		<h2>Import existing radio from v1?</h2>
		<p>
			To import a radio channel from the version 1 website, don't create a new radio channel.
		</p>
		<p>
			Visit the page <a href="${this.config.hrefMigrate}"><strong>${new URL(this.config.hrefMigrate).hostname}</strong></a> and follow the steps (using your v1 and v2 accounts).
		</p>
		<form method="dialog" part="form">
			<button part="button" formmethod="dialog">Close</button>
		</form>
	</dialog>
</section>
