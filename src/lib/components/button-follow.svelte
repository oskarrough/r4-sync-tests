<script>
	import {followsCollection, followChannel, unfollowChannel} from '$lib/tanstack/collections'
	import Icon from '$lib/components/icon.svelte'
	import * as m from '$lib/paraglide/messages'

	/** @type {{channel: import('$lib/types').Channel, label?: string, class?: string}} */
	let {channel, label, ...rest} = $props()

	let following = $derived([...followsCollection.state.values()].some((f) => f.channelId === channel.id))

	const toggle = (e) => {
		e.stopPropagation()
		e.preventDefault()
		if (following) unfollowChannel(channel.id)
		else followChannel(channel)
	}
</script>

<button
	onclick={toggle}
	title={following ? m.button_unfollow() : m.button_follow()}
	aria-label={following ? m.button_unfollow() : m.button_follow()}
	{...rest}
>
	<Icon icon={following ? 'favorite-fill' : 'favorite'} size={20} />
	{label}
</button>
