<script>
	import {sdk} from '@radio4000/sdk'
	import {appState} from '$lib/app-state.svelte'
	import {logger} from '$lib/logger'
	import {r4} from '$lib/r4'
	import {checkUser} from '$lib/api'
	import {sync as syncFollowers} from '$lib/r5/followers'

	const log = logger.ns('auth').seal()
	let unsubscribe = null

	$effect(() => {
		if (unsubscribe) return
		const {data} = sdk.supabase.auth.onAuthStateChange(handleAuthChange)
		unsubscribe = data.subscription?.unsubscribe
		return () => unsubscribe?.()
	})

	async function handleAuthChange(event, session) {
		log.log(event, session?.user?.email, appState)

		const user = session?.user
		const previousUserId = appState.user?.id
		appState.user = user

		if (!user) {
			if (appState.channels?.length) {
				console.log('cleaning up channels')
				appState.channels = []
			}
			return
		}

		const isNewSession = event === 'INITIAL_SESSION' && user.id !== previousUserId
		const isNewSignIn = event === 'SIGNED_IN' && user.id !== previousUserId
		console.log({isNewSession, isNewSignIn})
		if (isNewSession || isNewSignIn) {
			await checkUser()
		}
	}
</script>
