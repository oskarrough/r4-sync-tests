<script>
</script>

<svelte:head>
	<title>About Radio4000</title>
</svelte:head>

<article class="SmallContainer">
	<header>
		<figure>
			<img
				src="https://upload.wikimedia.org/wikipedia/commons/3/30/The_Burning_of_the_Library_at_Alexandria_in_391_AD.jpg"
				alt="The Burning of the Library at Alexandria in 391 AD by Ambrose Dudley"
				width="400"
			/>
			<figcaption>The Burning of the Library at Alexandria in 391 AD — Ambrose Dudley</figcaption>
		</figure>
		<h1>Radio4000</h1>
		<p>lotsa rhythms but algorithm aint one of them</p>
	</header>

	<section>
		<h2>It's your radio and music log</h2>
		<p>
			Essentially a glorified playlist. Add tracks via YouTube (and Soundcloud?)<br />
			Search and filter with @mentions and #hashtags.<br />
			Browse hundreds of channels made by people with different tastes.
		</p>
		<p>Data is stored locally in your browser. Export, download, tag, filter.</p>
	</section>

	<section>
		<p>Get your own URL to share. Listen to other people's radios without signing up for anything.</p>
		<ul>
			<li>Download tracks via CLI</li>
			<li>Query listening patterns with SQL</li>
			<li>Export everything anytime</li>
			<li>Full API access to build whatever you need</li>
			<li>Reuse our components in your own projects</li>
		</ul>
	</section>

	<section>
		<h2>Technical details</h2>
		<p>
			This is an experimental client for Radio4000. Just like <a href="https://radio4000.com">radio4000.com</a>, this
			web app pulls its data from the same Radio4000 PostgreSQL database. But it pulls it into <em>another</em> PostgreSQL
			database. One sitting locally, directly in your browser.
		</p>
	</section>

	<footer>
		<p>
			<a href="/create-channel" class="btn primary">Create your radio</a>
			<a href="/" class="btn">Start exploring</a>
		</p>
		<p>
			<a href="/repl">Repl</a> •
			<a href="https://github.com/radio4000/r4-sync-tests" rel="noopener noreferrer">Source code</a>
		</p>
	</footer>
</article>

<style>
	article {
		max-width: 70ch;
		margin: 2rem auto;
		padding: 0 1rem 5rem;
	}

	section {
		margin: 2rem 0;
	}

	h2 {
		margin-bottom: 0.5rem;
	}

	code {
		display: block;
		background: var(--gray-2);
		padding: 0.5rem;
		margin: 0.5rem 0;
		border-radius: 4px;
	}

	ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	footer {
		margin-top: 3rem;
		text-align: center;
		color: var(--color-text-secondary);
		display: flex;
		flex-flow: column;
		gap: 1rem;
	}

	footer a {
		color: var(--color-primary);
	}

	figure {
		margin: 2rem 0;
		text-align: center;
	}

	figure img {
		max-width: 100%;
		height: auto;
	}

	figcaption {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
		margin-top: 0.5rem;
	}
</style>
