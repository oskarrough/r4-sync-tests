<script>
	import {followChannel, unfollowChannel, isFollowing} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import Icon from '$lib/components/icon.svelte'

	/** @type {{channel: import('$lib/types').Channel, class?: string}} */
	let {channel, class: className = ''} = $props()

	let followerId = $derived(appState.channels?.[0] || 'local-user')
	let isBookmarked = $state(false)

	$effect(() => {
		isFollowing(followerId, channel.id).then((x) => {
			isBookmarked = x
		})
	})

	async function toggleBookmark(event) {
		event.stopPropagation()
		event.preventDefault()

		if (isBookmarked) {
			await unfollowChannel(followerId, channel.id)
			isBookmarked = false
		} else {
			await followChannel(followerId, channel.id)
			isBookmarked = true
		}
	}
</script>

<button
	onclick={toggleBookmark}
	class={className}
	title={isBookmarked ? 'Unfollow' : 'Follow'}
	aria-label={isBookmarked ? 'Unfollow' : 'Follow'}
>
	<Icon icon={isBookmarked ? 'favorite-fill' : 'favorite'} size={24} />
</button>
