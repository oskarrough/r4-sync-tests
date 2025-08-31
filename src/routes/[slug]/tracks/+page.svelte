<script>
	import CoverFlip from '$lib/components/cover-flip.svelte'
	import {r5} from '$lib/r5'

	const tracks = $derived(await r5.tracks.local({limit: 20}))

	$inspect(tracks)
</script>

<p>heya</p>

{#await tracks}
	<p>Loading...</p>
{:then tracks}
    {#if tracks.length === 0}
        <p>No tracks found.</p>
    {:else}
        <CoverFlip
            {tracks}
            active={({track}) => (
                <div style="margin-top: 0.5rem; max-width: 40ch;">
                    <h3 style="margin: 0 0 0.25rem 0;">{track.title}</h3>
                    {#if track.description}
                        <p style="margin: 0; color: var(--gray-9);">{track.description}</p>
                    {/if}
                </div>
            )}
        />
    {/if}
{/await}
