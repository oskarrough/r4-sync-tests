<script>
	import {getChannelTags, getChannelDateRange} from '$lib/api'
	import InputRange from '$lib/components/input-range.svelte'

	const {data} = $props()
	const {channel} = data

	if (!channel) {
		throw new Error('Channel not found')
	}

	let filter = $state('all')
	let timePeriod = $state('year') // 'year', 'quarter', 'month'
	let currentPeriod = $state(0)

	// Get date range for the channel
	let dateRangePromise = $derived.by(() => getChannelDateRange(channel.slug))
	let dateRange = $derived.by(async () => {
		const result = await dateRangePromise
		return result
	})

	// Calculate time periods based on date range
	let timePeriods = $derived.by(async () => {
		const range = await dateRange
		if (!range) return []

		const periods = []
		const start = new Date(range.minDate)
		const end = new Date(range.maxDate)

		if (timePeriod === 'year') {
			for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
				periods.push({
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
						periods.push({
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
				periods.push({
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

		return periods
	})

	// Get tags for current time period
	let tags = $state([])
	let filteredTags = $state([])

	$effect(async () => {
		const periods = await timePeriods
		let result

		if (!periods?.length || currentPeriod === 0) {
			result = await getChannelTags(channel.slug)
		} else {
			const period = periods[currentPeriod - 1]
			result = await getChannelTags(channel.slug, null, {
				startDate: period.startDate.toISOString(),
				endDate: period.endDate.toISOString()
			})
		}

		tags = result || []
	})

	$effect(() => {
		if (filter === 'all') {
			filteredTags = tags
		} else if (filter === 'single-use') {
			filteredTags = tags.filter((t) => t.count === 1)
		} else if (filter === 'frequent') {
			filteredTags = tags.filter((t) => t.count >= 5)
		} else if (filter === 'rare') {
			filteredTags = tags.filter((t) => t.count >= 2 && t.count <= 4)
		} else {
			filteredTags = tags
		}
	})

	let currentPeriodLabel = $derived.by(async () => {
		const periods = await timePeriods
		if (!periods?.length || currentPeriod === 0) return 'All time'
		return periods[currentPeriod - 1]?.label || 'All time'
	})
</script>

<main>
	<header class="row">
		<h1>{channel.name} tags</h1>

	<menu>
		<div class="filters">
			<label title="Tag filter">
				<select bind:value={filter}>
					<option value="all">All tags</option>
					<option value="single-use">One-time use</option>
					<option value="frequent">Frequent (5+)</option>
					<option value="rare">Rare (2-4)</option>
				</select>
			</label>
			<label title="Time period">
				<select bind:value={timePeriod} onchange={() => (currentPeriod = 0)}>
					<option value="year">Years</option>
					<option value="quarter">Quarters</option>
					<option value="month">Months</option>
				</select>
			</label>
		</div>
	</menu>
	</header>

	{#await timePeriods then periods}
		{#if periods?.length > 0}
			<div class="time-scrubber">
				<div class="period-info">
					{#await currentPeriodLabel then label}
						<span class="current-period">{label}</span>
					{/await}
				</div>
				<InputRange
					min={0}
					max={periods.length}
					step={1}
					bind:value={currentPeriod}
					title="Scrub through time periods"
				/>
				<div class="period-labels">
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
	{/await}

	{#if filteredTags.length > 0}
		<ol class="list">
			{#each filteredTags as { tag, count } (tag)}
				<li>
					<span class="tag">{tag}</span>
					<span class="count">{count})</span>
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
	main {
		padding: 1rem;
	}

	header h1 {
		margin-bottom: 0.5rem;
	}

	menu {
		position: sticky;
		top: 0.5rem;
		z-index: 1;

		.filters {
			display: flex;
			align-items: center;
			gap: 0.2rem;
		}

		label {
			user-select: none;
			display: flex;
			align-items: center;
			gap: 0.2rem;
		}
	}

	.tag {
	}

	.count {
	}

	.period-context {
		font-style: italic;
	}

	.time-scrubber {
		margin: 2rem 0.5rem 1rem;
		padding: 1rem;
		background: var(--gray-5);
		border-radius: var(--border-radius);
		border: 1px solid var(--gray-7);
	}

	.period-info {
		text-align: center;
		margin-bottom: 0.5rem;
	}

	.period-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
	}

	.period-labels span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.period-labels span.active {
		color: var(--accent-9);
	}
</style>
