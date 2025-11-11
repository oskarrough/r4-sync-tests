<script>
	import {followChannel, isFollowing as isFollowingChannel, unfollowChannel} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import Icon from '$lib/components/icon.svelte'
	import * as m from '$lib/paraglide/messages'

	/** @type {{channel: import('$lib/types').Channel, label?: string, class?: string}} */
	let {channel, label, ...rest} = $props()

	let followerId = $derived(appState.channels?.[0] || 'local-user')
	let isFollowing = $state(false)

	$effect(() => {
		isFollowingChannel(followerId, channel.id).then((x) => {
			isFollowing = x
		})
	})

	async function toggleFollow(event) {
		event.stopPropagation()
		event.preventDefault()

		if (isFollowing) {
			await unfollowChannel(followerId, channel.id)
			isFollowing = false
		} else {
			await followChannel(followerId, channel.id)
			isFollowing = true
		}
	}
</script>

<button
	onclick={toggleFollow}
	title={isFollowing ? m.button_unfollow() : m.button_follow()}
	aria-label={isFollowing ? m.button_unfollow() : m.button_follow()}
	{...rest}
>
	<Icon icon={isFollowing ? 'favorite-fill' : 'favorite'} size={20} />
	{label}
</button>
