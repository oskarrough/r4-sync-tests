import {sdk} from '@radio4000/sdk'

/**
 * Radio4000 API wrapper that throws on errors instead of returning {data, error}
 * Provides a consistent interface to the remote database
 */

export const r4 = {
	users: {
		async readUser() {
			const {data, error} = await sdk.users.readUser()
			if (error) throw error
			return data
		}
	},

	channels: {
		async readChannel(slug) {
			const {data, error} = await sdk.channels.readChannel(slug)
			if (error) throw error
			return data
		},

		async readUserChannels() {
			const {data, error} = await sdk.channels.readUserChannels()
			if (error) throw error
			return data
		},

		async readChannelTracks(slug) {
			const {data, error} = await sdk.channels.readChannelTracks(slug)
			if (error) throw error
			return data
		},

		async readFollowings(channelId) {
			const {data, error} = await sdk.channels.readFollowings(channelId)
			if (error) throw error
			return data
		},

		async followChannel(followerChannelId, channelId) {
			const {data, error} = await sdk.channels.followChannel(followerChannelId, channelId)
			if (error) throw error
			return data
		}
	},

	// Escape hatch - original SDK when you need {data, error} pattern
	sdk
}
