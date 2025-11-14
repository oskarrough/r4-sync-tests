<script>
	import {page} from '$app/state'
	import {r5} from '$lib/r5'
	import {delay} from '$lib/utils.ts'
	import * as m from '$lib/paraglide/messages'

	let isResetting = $state(false)
	let resetSuccess = $state(false)

	const errorMessage = $derived(page.url.searchParams.get('err'))

	async function resetDatabase() {
		isResetting = true
		try {
			await r5.db.reset()
			await r5.db.migrate()
			await delay(1000)
			console.log('Database recreated and migrated')
			resetSuccess = true
		} catch (err) {
			console.error('Reset failed:', err)
		} finally {
			isResetting = false
		}
	}
</script>

<main>
	<h1>{m.recovery_title()}</h1>
	<p>{m.recovery_sorry()}</p>
	<br />
	{#if errorMessage}
		<p><em>{decodeURIComponent(errorMessage)}</em></p>
		<br />
	{/if}

	<section>
		{#if resetSuccess}
			<h3>{m.recovery_reset_success()}</h3>
			<p><a href="/" data-sveltekit-reload>{m.recovery_go_home()}</a></p>
		{:else if isResetting}
			<p>{m.recovery_resetting()}</p>
		{:else}
			<p class="row row--vcenter">
				{m.error_repair_try()} ❶ <a href="/" class="btn">{m.recovery_reload_app()}</a>
			</p>
			<br />
			<p>{m.error_if_not_work()} &rarr; ② {m.recovery_reset_db()}</p>
			<button onclick={resetDatabase} disabled={isResetting} class="danger">{m.recovery_reset_button()}</button>
			<br />
			<br />
			<p>{m.recovery_reset_will()}</p>
			<ul>
				<li>{m.recovery_reset_point_1()}</li>
				<li>{m.recovery_reset_point_2()}</li>
				<li>{m.recovery_reset_point_3()}</li>
			</ul>
			<p>{m.recovery_note()}</p>
		{/if}
	</section>
</main>

<style>
	main {
		margin: 0.5rem;
	}
</style>
