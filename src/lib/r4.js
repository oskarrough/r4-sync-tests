import {sdk} from '@radio4000/sdk'

/**
 * Radio4000 API wrapper that throws on errors instead of returning {data, error}
 * Provides a consistent interface to the remote database
 */

async function unwrap(fn) {
	const {data, error} = await fn()
	if (error) throw error
	return data
}

export const r4 = {
	users: {
		readUser: (...args) => unwrap(() => sdk.users.readUser(...args))
	},

	channels: {
		readChannels: (limit = 2000) =>
			unwrap(() =>
				sdk.supabase
					.from('channels_with_tracks')
					.select('*')
					.order('updated_at', {ascending: false})
					.limit(limit)
					.throwOnError()
			),
		readChannel: (...args) => unwrap(() => sdk.channels.readChannel(...args)),
		readUserChannels: (...args) => unwrap(() => sdk.channels.readUserChannels(...args)),
		readChannelTracks: (...args) => unwrap(() => sdk.channels.readChannelTracks(...args)),
		readFollowings: (...args) => unwrap(() => sdk.channels.readFollowings(...args)),
		followChannel: (...args) => unwrap(() => sdk.channels.followChannel(...args))
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
