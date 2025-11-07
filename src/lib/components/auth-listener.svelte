<script>
	import {sdk} from '@radio4000/sdk'
	import {checkUser} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import {logger} from '$lib/logger'

	const log = logger.ns('auth').seal()
	let unsubscribe = null

	$effect(() => {
		if (unsubscribe) return
		const {data} = sdk.supabase.auth.onAuthStateChange(handleAuthChange)
		unsubscribe = data.subscription?.unsubscribe
		return () => unsubscribe?.()
	})

	async function handleAuthChange(event, session) {
		const user = session?.user
		const previousUserId = appState.user?.id
		appState.user = user

		if (!user) {
			if (appState.channels?.length) {
				appState.channels = []
			}
			return
		}

		const isNewSession = event === 'INITIAL_SESSION' && user.id !== previousUserId
		const isNewSignIn = event === 'SIGNED_IN' && user.id !== previousUserId

		if (isNewSession || isNewSignIn) {
			await checkUser()
		}
	}
</script>
