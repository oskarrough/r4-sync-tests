<script>
	const baseColors = [
		'--color-lavender',
		'--color-light-gray',
		'--color-light-blue',
		'--color-slate',
		'--color-green',
		'--color-red',
		'--color-orange',
		'--color-tan'
	]

	const grayScale = [
		'--gray-1',
		'--gray-2',
		'--gray-3',
		'--gray-4',
		'--gray-5',
		'--gray-6',
		'--gray-7',
		'--gray-8',
		'--gray-9',
		'--gray-10',
		'--gray-11',
		'--gray-12'
	]

	const fontSizes = ['--font-1', '--font-2', '--font-3', '--font-4', '--font-5', '--font-6', '--font-7', '--font-8']
</script>

<svelte:head>
	<title>Styleguide - R5</title>
</svelte:head>

<div class="styleguide">
	<h1>Styleguide</h1>

	<section>
		<h2>Base Colors</h2>
		<div class="color-grid">
			{#each baseColors as colorVar (colorVar)}
				<div class="color-item">
					<div class="color-swatch" style="background-color: var({colorVar})"></div>
					<div class="color-info">
						<code>{colorVar}</code>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Gray Scale (1-12)</h2>
		<div class="color-grid">
			{#each grayScale as grayVar (grayVar)}
				<div class="color-item">
					<div class="color-swatch" style="background-color: var({grayVar})"></div>
					<div class="color-info">
						<code>{grayVar}</code>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Font Sizes</h2>
		<div class="variable-grid">
			{#each fontSizes as sizeVar (sizeVar)}
				<article style="--size: var({sizeVar})">
					<h3>{sizeVar}</h3>
					<p>
						Sample text. The man writes like he's permanently high on incense and good intentions. Every sentence floats
						along with this oiled mystical confidence, as if he's personally received a download from the cosmos and is
						graciously sharing the password with the rest of us mortals. "Your children are not your children"—well,
						thanks Khalil.
					</p>
				</article>
			{/each}
		</div>
	</section>

	<section>
		<h2>A form</h2>
		<form>
			<div>
				<label
					>Your name
					<input type="text" />
				</label>
			</div>
			<div>
				<label
					>Your age
					<input type="number" />
				</label>
			</div>
			<div>
				<button type="button">Cancel</button>
				<button type="submit">Submit</button>
			</div>
		</form>
	</section>
</div>

<style>
	.styleguide {
		margin: 0 0.5rem;
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	h2 {
		margin-top: 3rem;
		margin-bottom: 0.5rem;
	}

	.color-item {
		border: 1px solid var(--gray-4);
		border-radius: var(--border-radius);
		overflow: hidden;
		background: var(--gray-2);
	}

	.color-swatch {
		height: 80px;
		width: 100%;
	}

	.color-info {
		padding: 0.5rem;
	}

	.variable-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(60ch, 1fr));
		gap: 1rem;

		h3 {
			border-left: var(--size) solid;
			padding-left: 0.5rem;
			margin: 0;
		}

		p {
			margin: 0;
			padding: 0.5rem;
			border-left: 1px solid;
		}
	}
</style>
