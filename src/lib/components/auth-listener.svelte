<script>
	import {sdk} from '@radio4000/sdk'
	import {pg} from '$lib/db'
	import {logger} from '$lib/logger'
	import {appState} from '$lib/app-state.svelte'
	import {syncFollowers} from '$lib/sync/followers'
	const log = logger.ns('auth').seal()

	$effect(() => {
		sdk.supabase.auth.onAuthStateChange(change)
	})

	async function change(event, session) {
		log.log('change', event, session)
		if (event === 'SIGNED_OUT') {
			appState.channels = []
		}
		if (event === 'INITIAL_SESSION' && session?.user) {
			try {
				const userChannelId = session.user.user_metadata?.channel_id
				if (userChannelId) {
					await syncFollowers(userChannelId)
				}
			} catch (err) {
				log.error('sync_followers_error', err)
			}
		}

		/*

		this.listeners.addEventListener('auth', async ({detail}) => {
			const sameUser = (this.user && this.user.id) === (detail.user && detail.user.id)
			if (
				detail.eventType === 'INITIAL_SESSION' ||
				(detail.eventType === 'SIGNED_IN' && !sameUser) ||
				detail.eventType === 'SIGNED_OUT'
			) {
				this.user = detail.user
				this.refreshUserData()
				this.refreshUserAccount()
			} else {
				// same user, no need to update
			}

			if (detail === 'PASSWORD_RECOVERY') {
				this.passwordRecovery()
			}
		})
		this.listeners.addEventListener('user-channels', ({detail}) => {
			if (['INSERT', 'DELETE', 'UPDATE'].includes(detail.eventType)) {
				this.refreshUserData()
			}
		})
		this.listeners.addEventListener('followers', ({detail}) => {
			if (['INSERT', 'DELETE', 'UPDATE'].includes(detail.eventType)) {
				this.refreshUserData()
			}
		})
		this.listeners.addEventListener('user-account', ({detail}) => {
			if (['INSERT', 'DELETE', 'UPDATE'].includes(detail.eventType)) {
				this.refreshUserAccount(detail.new)
			}
		})

			 */
	}
</script>
