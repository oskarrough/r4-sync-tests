<script>
	/* keep 250 please, since it is what cloudinary has already generated */
	let {id, alt = '', size = 250} = $props()

	/**
	 * @param {string} id - from cloudinary image
	 * @param {string} format -
	 */
	export function createImage(id, format = 'webp') {
		const baseUrl = 'https://res.cloudinary.com/radio4000/image/upload'
		const dimensions = `w_${size},h_${size}`
		const crop = 'c_thumb,q_60'
		return `${baseUrl}/${dimensions},${crop},fl_awebp/${id}.${format}`
	}
</script>

{#if id}
	<img loading="lazy" src={createImage(id)} {alt} />
{:else}
	<div class="placeholder">{alt.slice(0, 2) || '?'}</div>
{/if}

<style>
	img,
	.placeholder {
		max-width: 100%;
		border-radius: var(--border-radius);
		flex: 1;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--gray-4);
		color: var(--gray-7);
		font-size: var(--font-7);
		text-transform: uppercase;
	}
</style>
