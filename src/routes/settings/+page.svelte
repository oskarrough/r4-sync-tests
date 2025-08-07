<script>
	import {exportDb} from '$lib/db'
	import {sync} from '$lib/sync'
	import {resetDatabase} from '$lib/api'
	import {sdk} from '@radio4000/sdk'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'
	import KeyboardEditor from '$lib/components/keyboard-editor.svelte'
	import ThemeEditor from '$lib/components/theme-editor.svelte'
	/*import SyncDebug from '$lib/components/sync-debug.svelte'*/

	let syncing = $state(false)
	let resetting = $state(false)

	async function handleSync() {
		syncing = true
		try {
			await sync()
		} catch (err) {
			console.error(err)
		} finally {
			syncing = false
		}
	}

	async function handleReset() {
		resetting = true
		try {
			await resetDatabase()
		} catch (error) {
			console.error('resetDatabase() failed:', error)
		} finally {
			resetting = false
		}
	}

	async function logout() {
		await sdk.auth.signOut()
	}
</script>

<article>
	<menu>
		<button onclick={logout}>Logout</button>
		<button onclick={handleSync} data-loading={syncing} disabled={syncing}>
			{#if syncing}
				Syncing
			{:else}
				Sync
			{/if}
		</button>
		<!-- <button disabled>Import local database</button> -->
		<button onclick={exportDb}>Export local database</button>
		<button onclick={handleReset} data-loading={resetting} disabled={resetting} class="danger">
			{#if resetting}Resetting...{:else}Reset local database{/if}
		</button>
	</menu>

	<section>
		<h2>Settings</h2>
	</section>
	<section>
		<ThemeEditor />
	</section>
	<section>
		<KeyboardEditor />
	</section>
	<section>
		<PgliteRepl />
	</section>
	<section>
		<h2>About</h2>
		<p>
			Just like <a href="https://radio4000.com">radio4000.com</a>, this web app pulls its data from
			the Radio4000 PostgreSQL database. But it pulls it into another PostgreSQL database sitting
			locally, directly in your browser via WASM. This makes it feel faster, hopefully.
		</p>
		<p>Pull channels from R4 (including version 1) by <em>syncing</em> above &uarr;</p>
		<p>Writes are done remotely.</p>
		<p>
			Interested? <a href="https://matrix.to/#/#radio4000:matrix.org" rel="noreferrer">Come chat</a>
		</p>
	</section>

	<!--<SyncDebug />-->
</article>

<style>
	article {
		padding-bottom: var(--player-compact-space);
	}
	menu,
	section {
		margin: 0.5rem;
	}
	section {
		margin-top: 2rem;
	}
	p {
		max-width: 100ch;
	}
</style>
