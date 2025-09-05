<script>
	import {goto} from '$app/navigation'

	// hcaptcha-site-key="b0a493f2-49df-486b-bdee-b8459f7b1c21"
	//
	function onSubmit(event) {
		const error = event.detail.error
		const user = event.detail.data.user
		if (error) throw new Error(error)
		if (user) goto('/settings')
		console.error('signinerror', {user, error})
		throw new Error('Failed to sign in')
	}
</script>

<svelte:head>
	<title>Sign in - R5</title>
</svelte:head>

<article class="MiniContainer">
	<header>
		<p><a href="/auth">auth</a> / sign-in</p>
	</header>

	<h1>Log in to Radio4000</h1>
	<r4-sign-in onsubmit={onSubmit}></r4-sign-in>

	<footer>
		<p>New to R4? <a href="/auth/create-account">Create account &rarr;</a></p>
		<p><a href="/auth/reset-password">Forgot your password?</a></p>
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

	article > footer {
		margin-top: 3rem;
		text-align: center;
	}
</style>
