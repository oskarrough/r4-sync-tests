<script>
	import {page} from '$app/state'
	import * as m from '$lib/paraglide/messages'
</script>

<article>
	<p>{m.error_happened()}</p>
	<h1>{page.status}: {page.error?.message || m.error_unknown()}</h1>

	<hr />
	<p class="row row--vcenter">
		{m.error_repair_try()} ❶ <a href="/" class="btn">{m.error_reload_app()}</a>
	</p>

	<br />
	<p class="row row--vcenter">{m.error_if_not_work()} &rarr; ② <a href="/recovery" class="btn">{m.error_reset_app()}</a></p>
</article>

<style>
	article {
		margin: 0.5rem;
		display: flex;
		flex-flow: column;
	}
</style>
