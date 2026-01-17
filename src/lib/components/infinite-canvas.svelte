<script>
	import {InfiniteCanvas} from '$lib/infinite-canvas.js'

	/**
	 * @typedef {object} MediaItem
	 * @prop {string} url
	 * @prop {number} [width]
	 * @prop {number} [height]
	 * @prop {string} [slug]
	 * @prop {string} [id]
	 */

	/** @type {{media?: MediaItem[], backgroundColor?: string|null, fogColor?: string|null, onclick?: (item: MediaItem) => void}} */
	let {media = [], backgroundColor = null, fogColor = null, onclick} = $props()

	/** @type {HTMLDivElement} */
	let container
	/** @type {InfiniteCanvas} */
	let canvas

	$effect(() => {
		if (!container) return
		canvas = new InfiniteCanvas(container, {media, backgroundColor, fogColor, onClick: onclick})
		return () => canvas?.dispose()
	})

	$effect(() => {
		if (canvas && media) canvas.setMedia(media)
	})
</script>

<div class="canvas-container" bind:this={container}></div>

<style>
	.canvas-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
</style>
