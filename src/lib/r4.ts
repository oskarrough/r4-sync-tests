import {sdk} from '@radio4000/sdk'
import {debugLimit} from '$lib/db'

/**
 * Radio4000 API wrapper that throws on errors instead of returning {data, error}
 * Provides a consistent interface to the remote database
 */

/**
 * Generic unwrap function that preserves TypeScript types from SDK calls
 * Extracts data from {data, error} pattern and throws on error
 */
async function unwrap<T>(
	fn: () => Promise<{data?: T | null; error?: {message: string}}>
): Promise<T> {
	const result = await fn()
	if (result.error) throw result.error
	if (result.data == null) throw new Error('No data returned')
	return result.data as T
}

export const r4 = {
	users: {
		readUser: (...args: Parameters<typeof sdk.users.readUser>) =>
			unwrap(() => sdk.users.readUser(...args))
	},

	channels: {
		readChannels: (limit = debugLimit) =>
			unwrap(() =>
				sdk.supabase
					.from('channels_with_tracks')
					.select('*')
					.order('updated_at', {ascending: false})
					.limit(limit)
			),
		readChannel: (slug: string) =>
			unwrap(() => sdk.supabase.from('channels_with_tracks').select('*').eq('slug', slug)),
		readUserChannels: (...args: Parameters<typeof sdk.channels.readUserChannels>) =>
			unwrap(() => sdk.channels.readUserChannels(...args)),
		readChannelTracks: (...args: Parameters<typeof sdk.channels.readChannelTracks>) =>
			unwrap(() => sdk.channels.readChannelTracks(...args)),
		readFollowings: (...args: Parameters<typeof sdk.channels.readFollowings>) =>
			unwrap(() => sdk.channels.readFollowings(...args)),
		followChannel: (...args: Parameters<typeof sdk.channels.followChannel>) =>
			unwrap(() => sdk.channels.followChannel(...args))
	},

	broadcasts: {
		readBroadcastsWithChannel: async () => {
			const {data, error} = await sdk.supabase.from('broadcast').select(`
					channel_id,
					track_id,
					track_played_at,
					channels (
						id,
						name,
						slug,
						image,
						description
					)
				`)
			if (error) throw error
			return data || []
		}
	},

	// Escape hatch - original SDK when you need {data, error} pattern
	sdk
}
