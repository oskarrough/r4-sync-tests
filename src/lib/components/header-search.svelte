<script>
	import {onMount} from 'svelte'
	import {SvelteURLSearchParams} from 'svelte/reactivity'
	import {goto} from '$app/navigation'
	import {page} from '$app/state'
	import {toggleQueuePanel, toggleTheme} from '$lib/api'
	import SearchInput from '$lib/components/search-input.svelte'
	import {getPg, pg} from '$lib/r5/db'
	import * as m from '$lib/paraglide/messages'

	let debounceTimer = $state()
	let allChannels = $state([])

	// Reactive URL params - recreate when page URL changes
	let params = $derived(new SvelteURLSearchParams(page.url.searchParams))
	let searchQuery = $derived(params.get('search') || '')

	// Filtered channels for @mention autocomplete
	let filteredChannels = $derived.by(() => {
		if (!searchQuery.includes('@')) return allChannels.slice(0, 5)
		const mentionQuery = searchQuery.slice(searchQuery.lastIndexOf('@') + 1)
		if (mentionQuery.length < 1) return allChannels.slice(0, 5)
		return allChannels
			.filter(
				(c) => c.slug.includes(mentionQuery.toLowerCase()) || c.name.toLowerCase().includes(mentionQuery.toLowerCase())
			)
			.slice(0, 5)
	})

	const commands = $derived.by(() => [
		{id: 'settings', type: 'link', target: '/settings'},
		{id: 'toggle-theme', type: 'command', action: toggleTheme},
		{id: 'toggle-queue', type: 'command', action: toggleQueuePanel}
	])

	function getCommandTitle(id) {
		if (id === 'settings') return m.command_go_settings()
		if (id === 'toggle-theme') return m.command_toggle_theme()
		if (id === 'toggle-queue') return m.command_toggle_queue()
		return id
	}

	onMount(() => {
		getPg().then(() => queryChannels())
	})

	async function queryChannels() {
		try {
			const result = await pg.query('SELECT id, name, slug FROM channels ORDER BY name')
			allChannels = result.rows
		} catch (error) {
			console.error('Failed to load channels:', error)
		}
	}

	function debouncedSearch(value) {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			if (value.trim()) {
				params.set('search', value.trim())
				goto(`/search?${params}`)
			} else {
				params.delete('search')
				goto('/')
			}
		}, 300)
	}

	function handleSubmit(event) {
		event.preventDefault()
		if (searchQuery.trim()) {
			params.set('search', searchQuery.trim())
			goto(`/search?${params}`)
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Escape' && !searchQuery.trim()) {
			goto('/')
		}
		console.log(event.key, searchQuery)
	}
</script>

<form onsubmit={handleSubmit}>
	<SearchInput
		value={searchQuery}
		placeholder={m.header_search_placeholder()}
		oninput={(e) => debouncedSearch(e.target.value)}
		onkeydown={handleKeydown}
		DISABLEDlist="command-suggestions"
	/>
	<datalist id="command-suggestions">
		{#each commands as command (command.id)}
			<option value="/{command.id}">/{getCommandTitle(command.id)}</option>
		{/each}
		{#each filteredChannels as channel (channel.id)}
			<option value="@{channel.slug}">@{channel.slug} - {channel.name}</option>
		{/each}
	</datalist>
</form>

<style>
	:global(input[type='search']) {
		min-width: 24ch;
	}
</style>
