<script>
	import {goto} from '$app/navigation'
	import {page} from '$app/state'
	import * as m from '$lib/paraglide/messages'
	import AuthLogin from '$lib/components/auth-login.svelte'

	const redirect = $derived(page.url.searchParams.get('redirect') || '/settings')

	function handleSuccess() {
		goto(redirect)
	}
</script>

<svelte:head>
	<title>{m.auth_login_page_title()}</title>
</svelte:head>

<article class="MiniContainer">
	<h1>{m.auth_login_title()}</h1>
	<AuthLogin onSuccess={handleSuccess} {redirect} />

	<footer>
		<p>{m.auth_new_to_r4_intro()} <a href="/auth/create-account">{m.auth_card_create_title()}</a></p>
		<p><a href="/auth/reset-password">{m.auth_forgot_password()}</a></p>
		<p>
			<small>
				{m.auth_reset_help_intro()}
				<a href="https://matrix.to/#/#radio4000:matrix.org" target="_blank" rel="noopener">Matrix</a>
				{m.common_or()}
				<a href="mailto:contact@radio4000.com">contact@radio4000.com</a>.
			</small>
		</p>
	</footer>
</article>

<style>
	article {
		margin-top: 0.5rem;
	}

	h1 {
		margin: 3vh auto;
		font-size: var(--font-7);
		text-align: center;
	}

	article > footer {
		margin-top: 3rem;
		text-align: center;
	}
</style>
