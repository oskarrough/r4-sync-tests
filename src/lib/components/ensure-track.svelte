<script>
	import {tracksCollection} from '../../routes/tanstack/collections'
	import * as m from '$lib/paraglide/messages'

	const {tid} = $props()

	const track = $derived(tracksCollection.get(tid))
</script>

{#if track}
	{track.title}
{:else}
	{m.track_missing_label()}
{/if}
