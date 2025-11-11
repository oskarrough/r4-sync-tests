<script>
	import {page} from '$app/state'
	import * as m from '$lib/paraglide/messages'

	let didSubmit = $state(false)
	const redirect = page.url.searchParams.get('redirect')
	const redirectParam = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''

	function onSubmit(event) {
		console.log(event, event.detail)
		didSubmit = true
	}
</script>

<svelte:head>
	<title>{m.auth_create_page_title()}</title>
</svelte:head>

<article class="MiniContainer">
	{#if !didSubmit}
		<h1>{m.auth_create_account_title()}</h1>
		<r4-sign-up onsubmit={onSubmit}></r4-sign-up>
		<footer>
			<p>{m.auth_already_have_account()}</p>
			<p>
				<small>
					{m.auth_having_trouble()}
				</small>
			</p>
		</footer>
	{:else}
		<h1>{m.auth_welcome_almost_done()}</h1>
		<p>{m.auth_check_email()}<br /><br />{m.auth_click_link()}</p>
	{/if}
</article>

<style>
	article {
		margin-top: 0.5rem;
	}

	header {
		margin-bottom: 3vh;
	}

	h1 {
		margin-bottom: 3vh;
		font-size: var(--font-7);
		text-align: center;
	}

	footer {
		margin-top: 3rem;
		text-align: center;
	}
</style>
