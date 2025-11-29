<script>
	import {followsCollection, followChannel, unfollowChannel} from '../../routes/tanstack/collections'
	import {useLiveQuery, eq} from '@tanstack/svelte-db'
	import Icon from '$lib/components/icon.svelte'
	import * as m from '$lib/paraglide/messages'

	/** @type {{channel: import('$lib/types').Channel, label?: string, class?: string}} */
	let {channel, label, ...rest} = $props()

	const followQuery = useLiveQuery((q) =>
		q.from({follows: followsCollection}).where(({follows}) => eq(follows.channelId, channel.id))
	)
	let isFollowing = $derived((followQuery.data?.length || 0) > 0)

	function toggleFollow(event) {
		event.stopPropagation()
		event.preventDefault()

		if (isFollowing) {
			unfollowChannel(channel.id)
		} else {
			followChannel({id: channel.id, source: channel.source})
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
