import {sdk} from '@radio4000/sdk'
import {logger} from '$lib/logger'

const log = logger.ns('seed').seal()

type V1Channel = {slug: string; updated_at: string; latest_track_at?: string}

// V1 channel loader - cached in memory (static data, never changes)
let v1ChannelsCache: V1Channel[] | null = null
async function loadV1Channels(): Promise<V1Channel[]> {
	if (v1ChannelsCache) return v1ChannelsCache
	const response = await fetch('/channels_v1.json')
	v1ChannelsCache = await response.json()
	return v1ChannelsCache!
}

// Fetch a single channel by slug (v2 first, fallback to v1)
export async function fetchChannelBySlug(slug: string) {
	const {data} = await sdk.channels.readChannel(slug)
	if (data) return {...data, source: 'v2' as const}

	const v1Channel = (await loadV1Channels()).find((ch) => ch.slug === slug)
	return v1Channel || null
}

// Fetch all channels (v1+v2 merged, v2 wins on slug conflict)
export async function fetchAllChannels() {
	const [v1Channels, v2Result] = await Promise.all([loadV1Channels(), sdk.channels.readChannels()])

	const v2Channels = (v2Result.data || []).map((ch) => ({...ch, source: 'v2' as const}))
	const v2Slugs = new Set(v2Channels.map((ch) => ch.slug))
	const uniqueV1 = v1Channels.filter((ch) => !v2Slugs.has(ch.slug))

	log.info('fetchAllChannels', {v2: v2Channels.length, v1: uniqueV1.length})
	return [...v2Channels, ...uniqueV1]
}
