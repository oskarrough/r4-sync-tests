<script>
	import * as m from '$lib/paraglide/messages'
	import AuthSignup from '$lib/components/auth-signup.svelte'

	let didSignUp = $state(false)

	function handleSuccess() {
		didSignUp = true
	}
</script>

<svelte:head>
	<title>{m.auth_create_page_title()}</title>
</svelte:head>

<article class="MiniContainer">
	{#if didSignUp}
		<h1>{m.auth_welcome_almost_done()}</h1>
		<p>{m.auth_check_email()}</p>
		<p>{m.auth_click_link()}</p>
	{:else}
		<h1>{m.auth_create_account_title()}</h1>
		<AuthSignup onSuccess={handleSuccess} />
		<footer>
			<p>{m.auth_already_have_account_intro()} <a href="/auth/login">{m.auth_card_login_title()}</a></p>
			<p>
				<small>
					{m.auth_reset_help_intro()}
					<a href="https://matrix.to/#/#radio4000:matrix.org" target="_blank" rel="noopener">Matrix</a>
					{m.common_or()}
					<a href="mailto:contact@radio4000.com">contact@radio4000.com</a>.
				</small>
			</p>
		</footer>
	{/if}
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

	footer {
		margin-top: 3rem;
		text-align: center;
	}
</style>
