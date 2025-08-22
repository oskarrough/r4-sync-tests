<script>
	import {r5} from '$lib/r5'

	const {tid} = $props()

	let track = $state()

	$effect(async () => {
		if (!tid) return

		track = (await r5.db.pg.sql`select * from tracks where id = ${tid}`).rows[0]

		// if no local track, get it!
		if (!track) {
			await r5.tracks.pull({id: tid})
			track = (await r5.db.pg.sql`select * from tracks where id = ${tid}`).rows[0]
		}
	})

	// const promise = $derived.by(() => {
	// 	return r5.db.pg.sql`select * from tracks where id = ${tid}`
	// })
</script>

{#if track}
	{track.title}
{:else}
	MISSING TRACK
{/if}

<!-- {#await promise}
	loading track
{:then res}
	{@const track = res.rows[0]}
{:catch err}
	nop {err.message}
{/await} -->
