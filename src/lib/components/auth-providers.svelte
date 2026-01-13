<script>
	import {sdk} from '@radio4000/sdk'

	let {onEmailClick, redirect = '/settings'} = $props()

	function signInWithProvider(provider) {
		sdk.supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: window.location.origin + redirect
			}
		})
	}
</script>

<menu>
	<button type="button" onclick={onEmailClick}>Continue with email</button>
	<button type="button" onclick={() => signInWithProvider('google')}>Continue with Google</button>
	<button type="button" onclick={() => signInWithProvider('facebook')}>Continue with Facebook</button>
</menu>

<style>
	menu {
		display: flex;
		flex-direction: column;
	}
</style>
