<script>
	import InputRange from './input-range.svelte'
	import ChannelCard from './channel-card.svelte'
	import {generateFrequency} from '$lib/utils'

	const {channels = [], min = 88.0, max = 108.0} = $props()

	let frequency = $state(Math.random() * (max - min) + min)
	let channelsWithFrequency = $state([])
	let selectedChannel = $state(null)
	let isScanning = $state(false)
	let scanDirection = $state(1) // 1 for up, -1 for down

	let audioContext
	let staticNode
	let gainNode

	// Initialize channels with frequencies and track counts
	$effect(async () => {
		const processed = []
		for (const channel of channels) {
			const freq = await generateFrequency(channel.name, channel.slug, min, max)
			processed.push({
				...channel,
				frequency: freq,
				signalStrength: Math.pow(
					Math.log10(Math.max(channel.track_count || 1, 1)) / Math.log10(2000),
					5
				)
			})
		}
		channelsWithFrequency = processed.sort((a, b) => a.frequency - b.frequency)
	})

	// Find closest channel and calculate signal strength
	$effect(() => {
		if (channelsWithFrequency.length === 0) {
			selectedChannel = null
			return
		}

		const closest = channelsWithFrequency.reduce((prev, curr) =>
			Math.abs(curr.frequency - frequency) < Math.abs(prev.frequency - frequency) ? curr : prev
		)

		const distance = Math.abs(closest.frequency - frequency)
		const reception = Math.max(0, 1 - distance / 2) // Clear signal within 2 Hz

		selectedChannel = reception > 0.3 ? {...closest, reception} : null

		updateStaticLevel(reception)
	})

	function initAudio() {
		if (!audioContext) {
			audioContext = new (window.AudioContext || window.webkitAudioContext)()

			// Create static noise
			const bufferSize = audioContext.sampleRate * 2
			const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
			const data = buffer.getChannelData(0)

			for (let i = 0; i < bufferSize; i++) {
				data[i] = (Math.random() - 0.5) * 0.1
			}

			staticNode = audioContext.createBufferSource()
			staticNode.buffer = buffer
			staticNode.loop = true

			gainNode = audioContext.createGain()
			gainNode.gain.value = 0.05

			staticNode.connect(gainNode)
			gainNode.connect(audioContext.destination)
		}
	}

	function updateStaticLevel(reception) {
		if (gainNode) {
			const staticLevel = Math.max(0, 0.05 - reception * 0.04)
			gainNode.gain.exponentialRampToValueAtTime(
				Math.max(staticLevel, 0.001),
				audioContext.currentTime + 0.1
			)
		}
	}

	function toggleScanning() {
		if (!isScanning) {
			initAudio()
			staticNode?.start()
			startScanning()
		} else {
			stopScanning()
		}
		isScanning = !isScanning
	}

	let scanInterval
	function startScanning() {
		scanInterval = setInterval(() => {
			frequency += scanDirection * 0.2

			if (frequency >= max) {
				frequency = max
				scanDirection = -1
			} else if (frequency <= min) {
				frequency = min
				scanDirection = 1
			}
		}, 100)
	}

	function stopScanning() {
		clearInterval(scanInterval)
		staticNode?.stop()
		staticNode = null
		gainNode = null
		audioContext = null
	}

	// Signal strength visualization
	const signalBars = $derived.by(() => {
		if (!selectedChannel) return []
		const strength = selectedChannel.reception || 0
		const bars = 8
		return Array.from({length: bars}, (_, i) => ({
			active: i < strength * bars,
			height: Math.random() * 30 + 5 // Slight animation
		}))
	})
</script>

<div class="scanner">
	<header>
		<h2>
			<span class="freq">{frequency.toFixed(1)}</span>
			<span class="unit">R4Hz</span>
		</h2>

		<menu>
			<button onclick={toggleScanning} class:active={isScanning}>
				{isScanning ? 'Stop' : 'Scan'}
			</button>
			<button onclick={() => (frequency = Math.random() * (max - min) + min)}> Seek </button>
		</menu>

		<div class="signal-meter">
			{#each signalBars as bar (bar.id)}
				<div class="bar" class:active={bar.active} style="height: {bar.height}px"></div>
			{/each}
		</div>
	</header>

	<figure class="spectrum">
		{#each channelsWithFrequency as channel (channel.id)}
			<div
				class="marker"
				class:tuned={selectedChannel?.slug === channel.slug}
				style="left: {((channel.frequency - min) / (max - min)) * 100}%"
				title="{channel.name} - {channel.frequency.toFixed(1)}"
			>
				<div class="marker-signal" style="height: {0.5 + channel.signalStrength * 3.5}rem"></div>
			</div>
		{/each}
	</figure>

	<InputRange bind:value={frequency} {min} {max} step={0.1} />

	{#if selectedChannel}
		<div class="station" style="opacity: {selectedChannel.reception}">
			<div class="reception">
				{Math.round(selectedChannel.reception * 100)}% signal
			</div>
			<ChannelCard channel={selectedChannel} />
		</div>
	{:else}
		<div class="static-display">
			<div class="static-text">~ static ~</div>
		</div>
	{/if}
</div>

<style>
	.scanner {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		min-height: 80vh;
		justify-content: center;
		align-items: center;
		margin: 0 auto;
	}

	.scanner > header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0 0.8rem;
		background: var(--gray-12);
		color: var(--gray-1);
		line-height: 1;
		border: 1px solid var(--gray-12);
		border-bottom: 0;

		h2 {
			display: flex;
			align-items: baseline;
			gap: 0.3rem;
		}

		.freq {
			font-size: var(--font-9);
			font-weight: bold;
		}

		.unit {
			font-size: var(--font-2);
			color: var(--gray-9);
		}

		menu {
			margin: auto 1rem auto auto;
		}

		.signal-meter {
			display: flex;
			gap: 2px;
			align-items: flex-end;
			height: 3rem;
		}
	}

	.bar {
		width: 3px;
		background: var(--color-red);
		min-height: 3px;
		transition: background-color 0.1s;
	}

	.bar.active {
		position: relative;
		color: blue;
		z-index: 1;
	}

	.spectrum {
		position: relative;
		width: 100%;
		height: 4rem;
		pointer-events: none;
		border-left: 1px solid var(--gray-12);
		border-right: 1px solid var(--gray-12);
		background: var(--gray-5);
	}

	.marker {
		position: absolute;
		transform: translateX(-50%);
	}

	.marker-signal {
		width: 2px;
		background: var(--color-red);
		min-height: 5px;
		margin: 0 auto;
		transition: all 0.2s;
	}

	.marker.tuned .marker-signal {
		background: var(--color-purple);
		height: 3rem !important;
		width: 3px;
	}

	:global(.input-range) {
		width: 100%;
		border: 1px solid var(--gray-12);
	}

	.station {
		margin-top: 5vh;
		width: 400px;
		aspect-ratio: 1 / 2;
		transition: opacity 0.3s;
	}

	.reception {
		text-align: right;
		font-size: var(--font-1);
		color: var(--color-gray);
		margin-top: 0.5rem;
	}

	.static-display {
		height: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.static-text {
		color: var(--color-gray);
		font-style: italic;
		animation: flicker 0.1s infinite alternate;
	}

	@keyframes flicker {
		0% {
			opacity: 0.3;
		}
		100% {
			opacity: 0.7;
		}
	}
</style>
