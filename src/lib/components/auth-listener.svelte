<script>
	import {sdk} from '@radio4000/sdk'
	import {appState} from '$lib/app-state.svelte'
	import {logger} from '$lib/logger'
	import {r4} from '$lib/r4'
	import {sync as syncFollowers} from '$lib/r5/followers'

	const log = logger.ns('auth').seal()

	$effect(() => {
		sdk.supabase.auth.onAuthStateChange(change)
	})

	async function change(eventName, session) {
		log.log(eventName, session?.user?.email)

		if (appState.user !== session?.user) {
			appState.user = session?.user
		}

		if (eventName === 'SIGNED_OUT') {
			if (appState.channels?.length) appState.channels = []
		}

		if (eventName === 'INITIAL_SESSION' && session?.user) {
			try {
				const channels = await r4.channels.readUserChannels()
				if (channels.length) await syncFollowers(channels[0].id)
				appState.channels = channels.map((c) => c.id)
			} catch (err) {
				log.error('sync_followers_error', err)
			}
		}

		if (eventName === 'INITIAL_SESSION' && !session?.user && appState.channels) {
			appState.channels = []
		}
	}
</script>
