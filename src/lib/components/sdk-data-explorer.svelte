<script>
	import {r5} from '$lib/experimental-api'
	import {addToPlaylist} from '$lib/api'

	let {onSync = () => {}} = $props()

	let activeTab = $state('channels')
	let filterQuery = $state('')
	let channels = $state([])
	let tracks = $state([])
	let searchResults = $state([])
	let expandedItems = $state(new Set())
	let loading = $state(false)

	let filteredChannels = $derived(
		channels.filter(
			(c) =>
				!filterQuery ||
				c.name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
				c.slug?.toLowerCase().includes(filterQuery.toLowerCase())
		)
	)

	let filteredTracks = $derived(
		tracks.filter(
			(t) =>
				!filterQuery ||
				t.title?.toLowerCase().includes(filterQuery.toLowerCase()) ||
				t.url?.toLowerCase().includes(filterQuery.toLowerCase())
		)
	)

	async function loadData() {
		loading = true
		try {
			if (activeTab === 'channels') {
				channels = await r5.channels()
			} else if (activeTab === 'tracks') {
				tracks = await r5.tracks()
			}
		} finally {
			loading = false
		}
	}

	async function pullChannels(slug) {
		await r5.tracks.pull({slug})
		onSync()
		await loadData()
	}

	async function playChannel(channel) {
		const channelTracks = await r5.tracks({slug: channel.slug})
		if (channelTracks.length > 0) {
			await addToPlaylist(channelTracks.map((t) => t.id))
		}
	}

	async function performSearch() {
		if (!filterQuery) return
		loading = true
		try {
			searchResults = await r5.search(filterQuery)
			activeTab = 'search'
		} finally {
			loading = false
		}
	}

	function toggleExpanded(id) {
		if (expandedItems.has(id)) {
			expandedItems.delete(id)
		} else {
			expandedItems.add(id)
		}
		expandedItems = expandedItems
	}

	export function reload() {
		loadData()
	}

	$effect(() => {
		loadData()
	})
</script>

<section class="explorer">
	<nav class="tabs">
		<button
			class:active={activeTab === 'channels'}
			onclick={() => {
				activeTab = 'channels'
				loadData()
			}}
		>
			channels ({channels.length})
		</button>
		<button
			class:active={activeTab === 'tracks'}
			onclick={() => {
				activeTab = 'tracks'
				loadData()
			}}
		>
			tracks ({tracks.length})
		</button>
		<button class:active={activeTab === 'search'} onclick={() => (activeTab = 'search')}>
			search
		</button>
	</nav>

	<div class="filter">
		<input
			bind:value={filterQuery}
			placeholder={activeTab === 'search' ? 'search query...' : 'filter...'}
			onkeydown={(e) => e.key === 'Enter' && activeTab === 'search' && performSearch()}
		/>
		{#if activeTab === 'search'}
			<button onclick={performSearch}>🔍</button>
		{/if}
	</div>

	<div class="content">
		{#if loading}
			<div class="loading">⟳ loading...</div>
		{:else if activeTab === 'channels'}
			<ul>
				{#each filteredChannels as channel (channel.id)}
					<li>
						<div class="item">
							<button class="toggle" onclick={() => toggleExpanded(channel.id)}>
								{expandedItems.has(channel.id) ? '▼' : '▶'}
							</button>
							<span class="name">{channel.name || channel.slug}</span>
							<span class="meta">
								{channel.track_count || 0} tracks
								{channel.firebase_id ? '(v1)' : '(r4)'}
							</span>
							<div class="actions">
								<button onclick={() => pullChannels(channel.slug)}>pull</button>
								<button onclick={() => playChannel(channel)}>play</button>
							</div>
						</div>
						{#if expandedItems.has(channel.id)}
							<div class="details">
								<p><strong>slug:</strong> {channel.slug}</p>
								{#if channel.description}
									<p><strong>description:</strong> {channel.description}</p>
								{/if}
								<p><strong>created:</strong> {new Date(channel.created_at).toLocaleDateString()}</p>
								<p><strong>updated:</strong> {new Date(channel.updated_at).toLocaleDateString()}</p>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{:else if activeTab === 'tracks'}
			<ul>
				{#each filteredTracks.slice(0, 100) as track (track.id)}
					<li>
						<div class="item">
							<button class="toggle" onclick={() => toggleExpanded(track.id)}>
								{expandedItems.has(track.id) ? '▼' : '▶'}
							</button>
							<span class="name">{track.title}</span>
							<span class="meta">{track.channel_slug}</span>
							<div class="actions">
								<button onclick={() => addToPlaylist([track.id])}>queue</button>
							</div>
						</div>
						{#if expandedItems.has(track.id)}
							<div class="details">
								<p><strong>url:</strong> <a href={track.url} target="_blank">{track.url}</a></p>
								{#if track.description}
									<p><strong>description:</strong> {track.description}</p>
								{/if}
								{#if track.tags?.length}
									<p><strong>tags:</strong> {track.tags.join(', ')}</p>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
				{#if filteredTracks.length > 100}
					<li class="more">... and {filteredTracks.length - 100} more</li>
				{/if}
			</ul>
		{:else if activeTab === 'search'}
			{#if searchResults.length > 0}
				<ul>
					{#each searchResults as result (result.id)}
						<li>
							<div class="item">
								<span class="name">{result.title || result.name}</span>
								<span class="meta">{result.type}</span>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="empty">enter a search query and press enter</div>
			{/if}
		{/if}
	</div>
</section>

<style>
	.explorer {
		background: var(--gray-2);
		border: 1px solid var(--gray-4);
		display: flex;
		flex-direction: column;
		height: 400px;
		font-family: var(--monospace);
	}

	.tabs {
		display: flex;
		border-bottom: 1px solid var(--gray-4);
		background: var(--gray-1);
	}

	.tabs button {
		flex: 1;
		padding: 0.5rem;
		background: transparent;
		border: none;
		border-right: 1px solid var(--gray-4);
		cursor: pointer;
		font-family: inherit;
		font-size: 0.9rem;
	}

	.tabs button:last-child {
		border-right: none;
	}

	.tabs button:hover {
		background: var(--gray-3);
	}

	.tabs button.active {
		background: var(--gray-2);
		font-weight: bold;
	}

	.filter {
		padding: 0.5rem;
		border-bottom: 1px solid var(--gray-4);
		display: flex;
		gap: 0.5rem;
	}

	.filter input {
		flex: 1;
		padding: 0.3rem;
		background: var(--gray-1);
		border: 1px solid var(--gray-4);
		font-family: inherit;
	}

	.filter button {
		padding: 0.3rem 0.5rem;
		background: var(--gray-3);
		border: 1px solid var(--gray-4);
		cursor: pointer;
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.loading,
	.empty {
		padding: 1rem;
		text-align: center;
		color: var(--gray-8);
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	li {
		margin-bottom: 0.5rem;
	}

	.item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem;
		background: var(--gray-1);
		border: 1px solid var(--gray-3);
	}

	.item:hover {
		background: var(--gray-2);
	}

	.toggle {
		width: 1.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		font-family: inherit;
	}

	.name {
		flex: 1;
		font-weight: 500;
	}

	.meta {
		color: var(--gray-8);
		font-size: 0.85rem;
	}

	.actions {
		display: flex;
		gap: 0.3rem;
	}

	.actions button {
		padding: 0.2rem 0.4rem;
		background: var(--gray-3);
		border: 1px solid var(--gray-5);
		cursor: pointer;
		font-size: 0.8rem;
		font-family: inherit;
	}

	.actions button:hover {
		background: var(--gray-4);
	}

	.details {
		padding: 0.5rem 0.5rem 0.5rem 2rem;
		background: var(--gray-1);
		border: 1px solid var(--gray-3);
		border-top: none;
		font-size: 0.85rem;
	}

	.details p {
		margin: 0.2rem 0;
	}

	.details a {
		color: var(--color-lavender);
	}

	.more {
		padding: 0.5rem;
		text-align: center;
		color: var(--gray-8);
		font-style: italic;
	}
</style>
