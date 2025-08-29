<script>
	import ButtonPlay from './button-play.svelte'
	import ChannelAvatar from './channel-avatar.svelte'
	import ButtonFollow from './button-follow.svelte'

	/** @type {{channel: import('$lib/types').Channel, size?: number}}*/
	let {channel, size = 250} = $props()
</script>

<figure>
	<ButtonPlay {channel} class="play" />
	<ButtonFollow {channel} class="follow" />
	<ChannelAvatar id={channel.image} alt={channel.name} {size} />
</figure>

<style>
	figure {
		position: relative;
	}

	figure:not(:hover) :global(.play) {
		opacity: 0;
	}

	figure :global(.play) {
		position: absolute;
		top: 0.2rem;
		left: 0.2rem;
		width: 3rem;
		border: 0;
		box-shadow: none;
		transition: none;
	}

	figure :global(.follow) {
		position: absolute;
		top: 0.2rem;
		right: 0.2rem;
		width: 2.5rem;
		height: 2.5rem;
		border: 0;
		box-shadow: none;
		transition: none;
		opacity: 0;
	}

	figure:hover :global(.follow) {
		opacity: 1;
	}
</style>
