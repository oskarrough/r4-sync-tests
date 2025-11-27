<script>
	import {goto} from '$app/navigation'
	import {page} from '$app/state'
	import * as m from '$lib/paraglide/messages'

	function onSubmit(event) {
		const error = event.detail.error
		const user = event.detail.data.user
		if (error) throw new Error(error)
		if (user) {
			const redirect = page.url.searchParams.get('redirect') || '/settings'
			goto(redirect)
		} else {
			console.error('signinerror', {user, error})
			throw new Error('Failed to sign in')
		}
	}
</script>

<svelte:head>
	<title>{m.auth_login_page_title()}</title>
</svelte:head>

<article class="MiniContainer">
	<h1>{m.auth_login_title()}</h1>
	<r4-sign-in onsubmit={onSubmit}></r4-sign-in>

	<footer>
		<p>{m.auth_new_to_r4()}</p>
		<p><a href="/auth/reset-password">{m.auth_forgot_password()}</a></p>
		<p>
			<small>
				{m.auth_having_trouble()}
			</small>
		</p>
	</footer>
</article>

<style>
	article {
		margin-top: 0.5rem;
	}

	h1 {
		margin: 3vh auto;
		font-size: var(--font-7);
		text-align: center;
	}

	article > footer {
		margin-top: 3rem;
		text-align: center;
	}
</style>
