<script>
	import {sdk} from '@radio4000/sdk'
	import KeyboardEditor from '$lib/components/keyboard-editor.svelte'
	import {appState} from '$lib/app-state.svelte'

	const sha = $derived(__GIT_INFO__.sha)

	async function logout() {
		await sdk.auth.signOut()
	}
</script>

<svelte:head>
	<title>Settings & About - R5</title>
</svelte:head>

<article class="SmallContainer">
	<section>
		<h2>Settings</h2>
	</section>

	<section>
		<h2>Account</h2>
		{#if appState.user}
			<p>You are signed in as {appState.user.email}</p>
			<p>
				<button onclick={() => logout()}>Log out</button>
			</p>
		{:else}
			<p>
				<a href="/auth">Create account or sign in</a>
			</p>
		{/if}
	</section>

	<section>
		<h2>Appearance</h2>
		<p><a href="/settings/appearance">Customize theme and layout</a></p>
	</section>

	<section>
		<KeyboardEditor />
	</section>

	<section>
		<h2>Help</h2>
		<p>
			Very likely. Well, not very likely but likely. If the app is acting weird, tracks not loading or just broken, try <a
				href="/recovery">recovery</a
			>. Or
			<a href="https://matrix.to/#/#radiaao4000:matrix.org" rel="noreferrer"
				>join the public Radio4000 Matrix chat room</a
			>.
		</p>
	</section>

	<section>
		<h2>About</h2>
		<p>
			This is an experimental client for Radio4000. Just like <a href="https://radio4000.com">radio4000.com</a>, this
			web app pulls its data from the same Radio4000 PostgreSQL database. But it pulls it into <em>another</em> PostgreSQL
			database. One sitting locally, directly in your browser.
		</p>
		<p>
			One obvious thing still missing is the ability create a new radio. If you want one, please do so on radio4000.com
			and come back here. You can add tracks just fine.
		</p>
		<p>
			<a href="https://matrix.to/#/#radio4000:matrix.org" rel="noreferrer">Chat with us</a>
			•
			{#if sha}
				<a href="https://github.com/radio4000/r4-sync-tests/commit/{sha}" target="_blank" rel="noreferrer">
					Source at {sha}
				</a>
			{/if}
		</p>
	</section>
</article>

<style>
	article {
		margin-bottom: calc(var(--player-compact-size));
	}
	section {
		margin: 0.5rem 0.5rem 2rem;
	}
</style>
