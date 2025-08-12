<script>
	import {sdk} from '@radio4000/sdk'
	import KeyboardEditor from '$lib/components/keyboard-editor.svelte'
	import ThemeEditor from '$lib/components/theme-editor.svelte'

	const sha = $derived(__GIT_INFO__.sha)

	async function logout() {
		await sdk.auth.signOut()
	}
</script>

<article>
	<section>
		<h2>Settings</h2>
	</section>
	<section>
		<h2>Account</h2>
		<p>
			<button onclick={logout}>Logout</button>
		</p>
	</section>
	<section>
		<ThemeEditor />
	</section>
	<section>
		<KeyboardEditor />
	</section>
	<section>
		<h2>About</h2>
		<p>
			Just like <a href="https://radio4000.com">radio4000.com</a>, this web app pulls its data from
			the Radio4000 PostgreSQL database. But it pulls it into another PostgreSQL database sitting
			locally, directly in your browser via WASM. This makes it feel faster, more app-feeling
			hopefully. Pull channels from R4 (including version 1) by <em>syncing</em> above &uarr;
		</p>
		<br />
		<p>
			<a href="https://matrix.to/#/#radio4000:matrix.org" rel="noreferrer">Chat with us</a>
			•
			{#if sha}
				<a
					href="https://github.com/radio4000/r4-sync-tests/commit/{sha}"
					target="_blank"
					rel="noreferrer"
				>
					Source at {sha}
				</a>
			{/if}
		</p>
	</section>
</article>

<style>
	article {
		padding-bottom: var(--player-compact-space);
	}
	section {
		margin: 0.5rem 0.5rem 2rem;
	}
	p {
		max-width: 100ch;
	}
</style>
