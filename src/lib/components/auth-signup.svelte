<script>
	import {sdk} from '@radio4000/sdk'
	import AuthProviders from './auth-providers.svelte'
	import * as m from '$lib/paraglide/messages'

	let {redirect = '/settings'} = $props()

	let step = $state('providers') // 'providers' | 'email' | 'linkSent'
	let email = $state('')
	let error = $state(null)
	let loading = $state(false)

	async function sendMagicLink() {
		loading = true
		error = null
		const {error: authError} = await sdk.supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: window.location.origin + redirect
			}
		})
		loading = false
		if (authError) {
			error = authError.message
		} else {
			step = 'linkSent'
		}
	}

	function handleEmailContinue() {
		step = 'email'
	}
</script>

{#if step === 'linkSent'}
	<section>
		<h2>{m.auth_check_email()}</h2>
		<p>{m.auth_magic_link_sent({email})}</p>
		<menu>
			<button type="button" onclick={() => sendMagicLink()} disabled={loading}>
				{loading ? m.common_sending() : m.auth_resend()}
			</button>
			<button type="button" onclick={() => (step = 'email')}>{m.auth_use_different_email()}</button>
		</menu>
	</section>
{:else if step === 'email'}
	<form
		onsubmit={(e) => {
			e.preventDefault()
			sendMagicLink()
		}}
	>
		<label>
			{m.auth_email()}
			<input type="email" bind:value={email} required autocomplete="email" />
		</label>
		{#if error}
			<p role="alert">{error}</p>
		{/if}
		<button type="submit" class="primary" disabled={loading}>
			{loading ? m.common_sending() : m.auth_continue_with_email()}
		</button>
	</form>
	<button type="button" onclick={() => (step = 'providers')}>{m.common_back()}</button>
{:else}
	<AuthProviders onEmailClick={handleEmailContinue} {redirect} />
	<p>
		<small
			>{m.auth_terms_prefix()}
			<a href="https://legal.radio4000.com/terms-of-service" target="_blank" rel="noopener">{m.auth_terms_link()}</a
			>.</small
		>
	</p>
{/if}

<style>
	form,
	label {
		display: flex;
		flex-direction: column;
	}
	form {
		gap: 0.5rem;
	}
	label {
		gap: 0.2rem;
	}
	menu {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	section {
		text-align: center;
	}
	h2 {
		font-size: var(--font-7);
	}
	p:has(small) {
		margin-top: 1rem;
		text-align: center;
		color: var(--gray-9);
	}
</style>
