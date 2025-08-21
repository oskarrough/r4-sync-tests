<script>
	import {r5} from '$lib/r5'

	const {tid} = $props()

	const promise = $derived.by(() => {
		return r5.db.pg.sql`select * from tracks where id = ${tid}`
	})
</script>

{#await promise}
	loading track
{:then res}
	{@const track = res.rows[0]}
	{track.title}
{:catch err}
	nop {err.message}
{/await}
