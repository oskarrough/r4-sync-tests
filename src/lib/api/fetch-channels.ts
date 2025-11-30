import {sdk} from '@radio4000/sdk'
import {logger} from '$lib/logger'

const log = logger.ns('seed').seal()

// V1 channel loader - cached in memory (static data, never changes)
let v1ChannelsCache: unknown[] | null = null
async function loadV1Channels() {
	if (v1ChannelsCache) return v1ChannelsCache
	const response = await fetch('/channels_v1.json')
	v1ChannelsCache = await response.json()
	return v1ChannelsCache
}

// Fetch all channels (v1+v2 merged, v2 wins on slug conflict)
export async function fetchAllChannels() {
	const [v1Channels, v2Result] = await Promise.all([loadV1Channels(), sdk.channels.readChannels()])

	const v2Channels = (v2Result.data || []).map((ch) => ({...ch, source: 'v2' as const}))
	const v2SlugsSet = new Set(v2Channels.map((ch) => ch.slug))
	const uniqueV1 = (v1Channels as Array<{slug: string}>).filter((ch) => !v2SlugsSet.has(ch.slug))

	log.info('fetchAllChannels', {v2: v2Channels.length, v1: uniqueV1.length})
	return [...v2Channels, ...uniqueV1]
}
