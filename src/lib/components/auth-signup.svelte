<script>
	import {sdk} from '@radio4000/sdk'
	import AuthProviders from './auth-providers.svelte'

	let {onSuccess, redirect = '/settings'} = $props()

	let showEmailForm = $state(false)
	let error = $state(null)
	let loading = $state(false)

	async function handleSubmit(event) {
		event.preventDefault()
		error = null
		loading = true

		const formData = new FormData(event.target)
		const email = formData.get('email')
		const password = formData.get('password')

		const {data, error: authError} = await sdk.auth.signUp({email, password})
		loading = false

		if (authError) {
			error = authError.message
		} else if (data?.user) {
			onSuccess?.(data.user)
		}
	}
</script>

{#if showEmailForm}
	<form onsubmit={handleSubmit}>
		<label>
			Email
			<input type="email" name="email" required autocomplete="email" />
		</label>
		<label>
			Password
			<input type="password" name="password" required autocomplete="new-password" />
		</label>
		{#if error}
			<p role="alert">{error}</p>
		{/if}
		<button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
	</form>
	<p><button type="button" onclick={() => (showEmailForm = false)}>Back</button></p>
{:else}
	<AuthProviders onEmailClick={() => (showEmailForm = true)} {redirect} />
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
</style>
