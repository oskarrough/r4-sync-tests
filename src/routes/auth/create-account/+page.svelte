<script>
	let didSubmit = $state(false)

	function onSubmit(event) {
		console.log(event, event.detail)
		didSubmit = true
	}
</script>

<svelte:head>
	<title>Create account - R5</title>
</svelte:head>

<article class="MiniContainer">
	<header>
		<p><a href="/auth">auth</a> / create-account</p>
	</header>

	{#if !didSubmit}
		<h1>Create Radio4000 account</h1>
		<r4-sign-up onsubmit={onSubmit}></r4-sign-up>
		<footer>
			<p>Already have an account? <a href="/auth/login">Sign in &rarr;</a></p>
			<p>
				<small>
					Having trouble? <a href="https://matrix.to/#/#radio4000:matrix.org" target="_blank">Chat with us</a>
				</small>
			</p>
		</footer>
	{:else}
		<h1>Welcome, almost done!</h1>
		<p>Please check your e-mail.<br /><br />Click the link in the mail to activate your account.</p>
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
