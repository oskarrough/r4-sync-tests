<script>
	import {goto} from '$app/navigation'

	let didSubmit = $state(false)

	function onSubmit(event) {
		console.log(event, event.detail)
		didSubmit = true
	}
</script>

<svelte:head>
	<title>Create account - R5</title>
</svelte:head>

<article>
	<header>
		<p><a href="/auth">auth</a> / create-account</p>
	</header>

	<h1>Create account</h1>

	{#if !didSubmit}
		<r4-sign-up hcaptcha-site-key="b0a493f2-49df-486b-bdee-b8459f7b1c21" onsubmit={onSubmit}></r4-sign-up>
	{:else}
		<p>Now, last step — please check your e-mail. You will receive an email with a link to verify your account.</p>
	{/if}

	<footer>
		<p>Already have an account? <a href="/auth/sign-in">Sign in &rarr;</a></p>
		<p>
			Having trouble? <a href="https://matrix.to/#/#radio4000:matrix.org" target="_blank">Chat with the community</a>
		</p>
	</footer>
</article>

<style>
	article {
		max-width: 600px;
		margin: 0.5rem auto;
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
