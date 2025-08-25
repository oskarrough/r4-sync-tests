<svelte:head>
	<title>Auth - R5</title>
</svelte:head>

<article>
	<svg width="300" height="260" viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg">
		<title>icon-r4</title>
		<g fill="#000" fill-rule="evenodd">
			<path
				d="M125 217.53h108.86V260h40.19l-.005-42.47H300v-39.887h-25.955V38.147h-64.868L125 177.597v39.934zm34.215-40.066l87.847-70.16v70.16h-87.847z"
			/>
			<path
				d="M0 184.71h32.246v-75.302h42.91l50.088 75.302h24.554l-51.726-78.633c33.72-3.96 58.928-20.32 58.928-52.51C157 16.36 127.863 0 81.376 0H0v184.71zm15.156-91.56V50.796h53.627c27.23 0 47.792 5.052 47.792 21.25S94.068 93.15 69.34 93.15H15.155z"
			/>
		</g>
	</svg>

	<menu class="options">
		<a href="/auth/create-account">
			<h3>Create an account</h3>
			<p>I'm new to Radio4000</p>
		</a>
		<a href="/auth/signin">
			<h3>Sign in</h3>
			<p>I already have a channel</p>
		</a>
	</menu>
</article>

<style>
	svg {
		display: block;
		width: 4rem;
		height: auto;
		margin: 5vh auto 3vh;
	}
	svg g {
		fill: light-dark(red, blue);
		fill: var(--gray-12);
	}

	article {
		max-width: 600px;
		margin: 0 auto;
	}

	.options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 2rem;
		text-align: center;
		font-size: var(--font-6);

		> a {
			text-decoration: none;
			padding: 2rem 1rem;
			border: 1px solid var(--gray-6);
			border-radius: var(--border-radius);

			&:hover {
				background: var(--accent-7);
				border-color: var(--accent-1);
			}
		}

		h3 {
			text-decoration: underline;
			font-size: var(--font-7);
			font-weight: 600;
		}
	}
</style>
