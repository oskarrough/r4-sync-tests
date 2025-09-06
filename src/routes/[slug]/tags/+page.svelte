<script>
	import {local, getChannelDateRange} from '$lib/r5/tags'
	import InputRange from '$lib/components/input-range.svelte'

	const {data} = $props()
	const {channel} = data

	if (!channel) {
		throw new Error('Channel not found')
	}

	let filter = $state('all')
	let timePeriod = $state('year')
	let currentPeriod = $state(0)
	let filteredTags = $state([])
	let periods = $state([])

	// Load date range and generate periods
	async function loadPeriods() {
		const range = await getChannelDateRange(channel.slug)
		if (!range) return []

		const newPeriods = []
		const start = new Date(range.minDate)
		const end = new Date(range.maxDate)

		if (timePeriod === 'year') {
			for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
				newPeriods.push({
					label: year.toString(),
					startDate: new Date(year, 0, 1),
					endDate: new Date(year + 1, 0, 1)
				})
			}
		} else if (timePeriod === 'quarter') {
			for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
				for (let q = 0; q < 4; q++) {
					const quarterStart = new Date(year, q * 3, 1)
					const quarterEnd = new Date(year, (q + 1) * 3, 1)
					if (quarterStart <= end && quarterEnd >= start) {
						newPeriods.push({
							label: `${year} Q${q + 1}`,
							startDate: quarterStart,
							endDate: quarterEnd
						})
					}
				}
			}
		} else if (timePeriod === 'month') {
			let currentYear = start.getFullYear()
			let currentMonth = start.getMonth()
			const endYear = end.getFullYear()
			const endMonth = end.getMonth()

			while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
				const monthStart = new Date(currentYear, currentMonth, 1)
				const monthEnd = new Date(currentYear, currentMonth + 1, 1)
				newPeriods.push({
					label: monthStart.toLocaleDateString('en', {year: 'numeric', month: 'short'}),
					startDate: monthStart,
					endDate: monthEnd
				})
				currentMonth++
				if (currentMonth > 11) {
					currentMonth = 0
					currentYear++
				}
			}
		}

		periods = newPeriods
		await loadTags()
	}

	// Load tags based on current period and filter
	async function loadTags() {
		let result

		if (currentPeriod === 0 || !periods.length) {
			// All time
			result = await local({slug: channel.slug})
		} else {
			// Specific period
			const period = periods[currentPeriod - 1]
			result = await local({
				slug: channel.slug,
				startDate: period.startDate,
				endDate: period.endDate
			})
		}

		// Apply filter
		const tags = result || []
		if (filter === 'all') {
			filteredTags = tags
		} else if (filter === 'single-use') {
			filteredTags = tags.filter((t) => t.count === 1)
		} else if (filter === 'frequent') {
			filteredTags = tags.filter((t) => t.count >= 5)
		} else if (filter === 'rare') {
			filteredTags = tags.filter((t) => t.count >= 1 && t.count <= 4)
		} else {
			filteredTags = tags
		}
	}

	// Event handlers
	function onTimePeriodChange() {
		currentPeriod = 0
		loadPeriods()
	}

	function onPeriodChange() {
		loadTags()
	}

	function onFilterChange() {
		loadTags()
	}

	// Initialize
	loadPeriods()

	let currentPeriodLabel = $derived(currentPeriod === 0 ? 'All time' : periods[currentPeriod - 1]?.label || 'All time')
</script>

<main>
	<header class="row">
		<h1>{channel.name} tags</h1>
		<menu>
			<label title="Tag filter">
				<select bind:value={filter} onchange={onFilterChange}>
					<option value="all">All tags</option>
					<option value="single-use">One-time tags</option>
					<option value="frequent">Frequent (5+)</option>
					<option value="rare">Rare (1-4)</option>
				</select>
			</label>
			<label title="Time period">
				<select bind:value={timePeriod} onchange={onTimePeriodChange}>
					<option value="year">Years</option>
					<option value="quarter">Quarters</option>
					<option value="month">Months</option>
				</select>
			</label>
		</menu>
	</header>

	{#if periods.length > 0}
		<div class="scrubber">
			<h3>{currentPeriodLabel}</h3>
			<InputRange
				min={0}
				max={periods.length}
				step={1}
				visualStep={timePeriod === 'year'
					? 1
					: timePeriod === 'quarter'
						? Math.max(1, Math.ceil(periods.length / 15))
						: Math.max(1, Math.ceil(periods.length / 25))}
				bind:value={currentPeriod}
				oninput={onPeriodChange}
				title="Scrub through time periods"
			/>
			<div class="scrubber-labels">
				<span>All time</span>
				{#if periods.length < 20}
					{#each periods as period, i (period.label)}
						<span class:active={currentPeriod === i + 1}>{period.label}</span>
					{/each}
				{:else}
					<span>{periods[0]?.label}</span>
					<span>...</span>
					<span>{periods[periods.length - 1]?.label}</span>
				{/if}
			</div>
		</div>
	{/if}

	{#if filteredTags.length > 0}
		<ol class="list">
			{#each filteredTags as { tag, count } (tag)}
				<li>
					<span class="tag">
						<a href={`/search?search=@${channel.slug} ${tag}`}>
							{tag}
						</a>
					</span>
					<span class="count">{count}</span>
				</li>
			{/each}
		</ol>
		<footer>
			<p>
				Showing {filteredTags.length} tags
				{#await currentPeriodLabel then label}
					{#if label !== 'All time'}
						<span class="period-context">for {label}</span>
					{/if}
				{/await}
			</p>
		</footer>
	{:else}
		<p>No tags found for this filter.</p>
	{/if}
</main>

<style>
	header {
		margin: 0.5rem 0.5rem 0;
		place-items: center;
	}

	.scrubber {
		margin: 1rem 0.5rem 1rem;
		padding: 1rem;
		background: var(--gray-5);
		border-radius: var(--border-radius);
		border: 1px solid var(--gray-7);
	}

	.scrubber h3 {
		text-align: center;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.scrubber-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
	}

	.scrubber-labels span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.scrubber-labels span.active {
		color: var(--accent-9);
	}

	.list {
		margin: 0 0.5rem;

		.tag {
		}

		.count {
		}
	}

</style>
