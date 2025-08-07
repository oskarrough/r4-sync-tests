<script>
	import ButtonPlay from './button-play.svelte'
	import ChannelAvatar from './channel-avatar.svelte'
	import BookmarkButton from './bookmark-button.svelte'

	/** @type {{channel: import('$lib/types').Channel, size?: number}}*/
	let {channel, size = 250} = $props()
</script>

<figure>
	<ButtonPlay {channel} class="play-button" />
	<BookmarkButton {channel} class="bookmark-button" />
	<ChannelAvatar id={channel.image} alt={channel.name} {size} />
</figure>

<style>
	figure {
		position: relative;
	}

	figure:not(:hover) :global(.play-button) {
		opacity: 0;
	}

	figure :global(.play-button) {
		position: absolute;
		top: 0.2rem;
		left: 0.2rem;
		width: 3rem;
		border: 0;
		box-shadow: none;
		transition: none;
	}

	figure :global(.bookmark-button) {
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

	figure:hover :global(.bookmark-button) {
		opacity: 1;
	}
</style>
