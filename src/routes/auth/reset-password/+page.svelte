<script>
	function handleResetPassword(event) {
		console.log('handleResetPassword', event.detail)
	}
</script>

<svelte:head>
	<title>Forgot password</title>
</svelte:head>

<article class="MiniContainer">
	<header>
		<p><a href="/auth">auth</a> / forgot password</p>
	</header>

	<h1>Forgot your password?</h1>
	<p>Enter your Radio4000 email address</p>
	<br />
	<p>We'll send you instructions to reset your password</p>
	<br />

	<r4-password-reset onsubmit={handleResetPassword}></r4-password-reset>
	<!-- <r4-update-password onsubmit={handleUpdatePassword}></r4-update-password> -->

	<footer>
		<p>
			<small>
				Having trouble? <a href="https://matrix.to/#/#radio4000:matrix.org" target="_blank">Chat with us</a>
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

	footer {
		margin-top: 3rem;
		text-align: center;
	}
</style>
