<script>
	import * as m from '$lib/paraglide/messages'

	let emailSent = $state(false)

	function handleResetPassword(event) {
		const {error} = event.detail
		if (!error) {
			emailSent = true
		}
	}
</script>

<svelte:head>
	<title>{m.auth_reset_page_title()}</title>
</svelte:head>

<div class="center-page">
	<article class="MiniContainer">
		<header>
			<p><a href="/auth">{m.auth_page_title()}</a> / {m.auth_reset_page_title()}</p>
		</header>

		<h1>{m.auth_reset_heading()}</h1>
		<p>{m.auth_reset_prompt_email()}</p>
		<br />
		<p>{m.auth_reset_instruction()}</p>
		<br />

		{#if emailSent}
			<p><strong>{m.auth_reset_email_sent()}</strong></p>
		{:else}
			<r4-password-reset onsubmit={handleResetPassword}></r4-password-reset>
		{/if}
		<!-- <r4-update-password onsubmit={handleUpdatePassword}></r4-update-password> -->

		<footer>
			<p>
				<small>
					{m.auth_reset_help_intro()}
					<a href="https://matrix.to/#/#radio4000:matrix.org" target="_blank">{m.auth_reset_help_link()}</a>
				</small>
			</p>
		</footer>
	</article>
</div>

<style>
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
