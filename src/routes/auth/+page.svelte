<script>
	import IconR4 from '$lib/icon-r4.svelte'
	import {appState} from '$lib/app-state.svelte'
	import {sdk} from '@radio4000/sdk'
</script>

<svelte:head>
	<title>Auth - R5</title>
</svelte:head>

<article>
	<figure class="logo">
		<IconR4 />
	</figure>

	{#if appState.user}
		<p>Signed in as {appState.user.email}.</p>
		{#each appState.channels as id (id)}
			<p>channel id: {id}</p>
		{/each}
		<p><button type="button" onclick={() => sdk.auth.signOut()}>Logout</button></p>
		{#if !appState.channels}
			<p>
				<a href="/create-channel"> Create radio channel </a>
			</p>
		{/if}
	{:else}
		<menu class="options">
			<a href="/auth/create-account">
				<h3>Create an account</h3>
				<p>I'm new to Radio4000</p>
			</a>
			<a href="/auth/signin">
				<h3>Sign in</h3>
				<p>I already have a channel</p>
			</a>
		</menu>
	{/if}
</article>

<style>
	.logo {
		display: block;
		text-align: center;
		margin: 5vh 0 3vh;
		:global(svg) {
			width: 6rem;
			height: auto;
		}
	}

	article {
		max-width: 600px;
		margin: 0 auto;
	}

	.options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 2rem;
		text-align: center;
		font-size: var(--font-6);

		> a {
			text-decoration: none;
			padding: 2rem 1rem;
			border: 1px solid var(--gray-6);
			border-radius: var(--border-radius);

			&:hover {
				background: var(--accent-7);
				color: light-dark(var(--gray-12), var(--gray-1));
				border-color: var(--accent-1);
			}
		}

		h3 {
			text-decoration: underline;
			font-size: var(--font-7);
			font-weight: 600;
		}
	}
</style>
