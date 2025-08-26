<script>
	import {goto} from '$app/navigation'
</script>

<svelte:head>
	<title>Sign in - R5</title>
</svelte:head>

<article>
	<header>
		<p><a href="/auth">auth</a> / sign-in</p>
	</header>

	<h1>Sign in</h1>
	<r4-sign-in hcaptcha-site-key="b0a493f2-49df-486b-bdee-b8459f7b1c21" onsubmit={() => goto('/auth')}></r4-sign-in>

	<footer>
		<p>
			Having trouble? <a href="https://matrix.to/#/#radio4000:matrix.org" target="_blank">Chat with us</a>
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

	article > footer {
		margin-top: 3rem;
		text-align: center;
	}
</style>
