<script>
	import {getContext} from 'svelte'
	import {SvelteSet} from 'svelte/reactivity'
	import {browser} from '$app/environment'
	import ChannelAvatar from '$lib/components/channel-avatar.svelte'
	import {analyzeChannel} from '../spam-warrior/spam-detector.js'

	const STORAGE_KEY = 'r5-spam-decisions'

	const getChannels = getContext('channels')
	const allChannels = $derived(getChannels())

	// Channels with 0 tracks AND spam signals, sorted by confidence (highest first)
	const candidates = $derived(
		allChannels
			.filter((ch) => (ch.track_count ?? 0) === 0)
			.map((ch) => ({...ch, analysis: analyzeChannel(ch)}))
			.filter((ch) => ch.analysis.confidence > 0)
			.sort((a, b) => b.analysis.confidence - a.analysis.confidence)
	)

	/** @type {Record<string, boolean>} */
	let decisions = $state(browser ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') : {})

	let expanded = new SvelteSet()

	function save() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions))
	}

	function markDelete(id) {
		decisions[id] = true
		save()
	}

	function markKeep(id) {
		decisions[id] = false
		save()
	}

	function toggleExpand(id) {
		if (expanded.has(id)) {
			expanded.delete(id)
		} else {
			expanded.add(id)
		}
	}

	const undecided = $derived(candidates.filter((ch) => !(ch.id in decisions)))
	const toDelete = $derived(candidates.filter((ch) => decisions[ch.id] === true))
	const keptCount = $derived(Object.values(decisions).filter((v) => v === false).length)

	const sql = $derived(
		toDelete
			.map(
				(ch) =>
					`-- ${ch.name}\nDELETE FROM channel_track WHERE channel_id = '${ch.id}';\nDELETE FROM channels WHERE id = '${ch.id}';`
			)
			.join('\n\n')
	)

	function formatDate(dateStr) {
		if (!dateStr) return '?'
		const d = new Date(dateStr)
		const now = new Date()
		const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
		if (diffDays < 7) return `${diffDays}d ago`
		if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
		if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
		return d.getFullYear().toString()
	}

	function confidenceColor(confidence) {
		if (confidence >= 0.6) return 'var(--color-danger, #c00)'
		if (confidence >= 0.4) return 'var(--color-warning, #a50)'
		return 'var(--color-muted, #666)'
	}
</script>

<main>
	<header>
		<h1>Spam Angel</h1>
		<p>Empty channels with spam signals. Evidence shown inline.</p>
		<p class="stats">
			<strong>{undecided.length}</strong> to review ·
			<strong>{toDelete.length}</strong> to delete ·
			<strong>{keptCount}</strong> kept
		</p>
		<p>
			<button onclick={() => navigator.clipboard.writeText(sql)} disabled={toDelete.length === 0}>
				Copy SQL ({toDelete.length})
			</button>
		</p>
	</header>

	<pre>{sql || '-- Mark channels for deletion to generate SQL'}</pre>

	<ul class="list">
		{#each undecided as channel (channel.id)}
			{@const ev = channel.analysis.evidence}
			{@const hasMusic = ev.musicTerms.length > 0}
			{@const isExpanded = expanded.has(channel.id)}
			<li>
				<div class="main-row">
					<button class="avatar" onclick={() => toggleExpand(channel.id)} title="Click to expand">
						<ChannelAvatar id={channel.image} alt={channel.name} size={40} />
					</button>

					<div class="info">
						<div class="title-row">
							<h3>{channel.name}</h3>
							<span class="meta">{channel.slug} · {formatDate(channel.created_at)}</span>
						</div>

						<!-- Evidence inline -->
						<div class="evidence">
							{#if ev.keywords.length > 0}
								<span class="tag spam">{ev.keywords.slice(0, 4).join(', ')}{ev.keywords.length > 4 ? '…' : ''}</span>
							{/if}
							{#if ev.phrases.length > 0}
								<span class="tag spam">"{ev.phrases[0]}"</span>
							{/if}
							{#if ev.locations.length > 0}
								<span class="tag location">{ev.locations.join(', ')}</span>
							{/if}
							{#if hasMusic}
								<span class="tag music">{ev.musicTerms.join(', ')}</span>
							{/if}
						</div>
					</div>

					<span class="score" style="color: {confidenceColor(channel.analysis.confidence)}">
						{Math.round(channel.analysis.confidence * 100)}%
					</span>

					<div class="actions">
						<button onclick={() => markKeep(channel.id)}>Keep</button>
						<button class="danger" onclick={() => markDelete(channel.id)}>Delete</button>
					</div>
				</div>

				{#if isExpanded || channel.description?.length > 100}
					<div class="expanded" class:collapsed={!isExpanded && channel.description?.length > 100}>
						<p class="desc" onclick={() => toggleExpand(channel.id)}>
							{isExpanded ? channel.description : channel.description?.slice(0, 150)}
							{#if !isExpanded && channel.description?.length > 150}…{/if}
						</p>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</main>

<style>
	header {
		margin: 0.5rem;
	}
	.stats {
		margin-top: 1rem;
	}
	h1,
	h3 {
		margin: 0;
		font-weight: normal;
	}
	li {
		padding: 0.5rem;
		border-bottom: 1px solid var(--color-border, #ddd);
	}
	.main-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.avatar {
		width: 40px;
		flex-shrink: 0;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}
	.info {
		flex: 1;
		min-width: 0;
	}
	.title-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.meta {
		font-size: 0.75em;
		opacity: 0.5;
	}
	.evidence {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.25rem;
	}
	.tag {
		font-size: 0.7em;
		padding: 0.1em 0.4em;
		border-radius: 3px;
		white-space: nowrap;
	}
	.tag.spam {
		background: #e57373;
		color: #fff;
	}
	.tag.location {
		background: #fef3e0;
		color: #854;
	}
	.tag.music {
		background: #e8f5e9;
		color: #2e7d32;
	}
	.score {
		min-width: 2.5rem;
		text-align: right;
		font-weight: bold;
		font-size: 0.9em;
	}
	.actions {
		display: flex;
		gap: 0.25rem;
	}
	.actions button {
		padding: 0.25em 0.5em;
		font-size: 0.85em;
	}
	.actions .danger {
		background: #c00;
		color: white;
		border-color: #900;
	}
	.expanded {
		margin-top: 0.5rem;
		margin-left: 48px;
	}
	.expanded.collapsed {
		cursor: pointer;
	}
	.desc {
		margin: 0;
		font-size: 0.85em;
		opacity: 0.8;
		white-space: pre-wrap;
		word-break: break-word;
	}
	pre {
		max-height: 200px;
		overflow: auto;
		border: 1px solid var(--color-border, #ddd);
		padding: 0.5rem;
		margin: 0 0.5rem;
	}
</style>
