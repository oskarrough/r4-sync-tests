// from r5-channels.json
export interface ChannelFirebase {
	firebase_id: string
	created_at: number
	updated_at: number
	name: string
	slug: string
	description?: string
	image?: string
	track_count?: number
	track_ids?: string[]
}

export interface Channel {
	id: string
	created_at: string
	updated_at: string
	name: string
	slug: string
	description?: string
	image?: string
	url?: string
	// custom ones
	tracks_outdated?: boolean
	track_count?: number

	latitude?: number
	longitude?: number

	// Link to v1 channel
	firebase_id?: string
	source?: string // set to "v1" for firebase ones

	// for broadcasting
	broadcasting?: boolean
	broadcast_track_id?: string
	broadcast_started_at?: string
	tracks_synced_at?: string

	// local only
	spam?: boolean
}

export type Track = {
	id: string
	created_at: string
	updated_at: string
	url: string
	title: string
	description?: string
	discogs_url?: string
	tags?: string[]
	mentions?: string[]
	// fields below this line do not exist on remote r4 track
	firebase_id?: string
	// sometimes we include this, too
	channel_id?: string
	channel_slug?: string
	// when joined with track_meta table
	duration?: number
	youtube_data?: object
	musicbrainz_data?: object
	discogs_data?: object
}

export interface AppState {
	id: number
	playlist_tracks: string[]
	playlist_tracks_shuffled: string[]
	playlist_track?: string
	is_playing: boolean
	theme?: string
	volume: number
	custom_css_variables: Record<string, string>
	counter: number
	channels_display: string
	/** the user's channels */
	channels?: string[]
	shuffle: boolean
	broadcasting_channel_id?: string
	listening_to_channel_id?: string
	queue_panel_visible: boolean
	show_video_player: boolean
	player_expanded?: boolean
	shortcuts: Record<string, string>
	hide_track_artwork: boolean
	user?: User
}

interface User {
	id: string
	email: string
}

export type KeyBindingsConfig = Record<string, string>

export interface Broadcast {
	channel_id: string
	track_id: string
	track_played_at: string
}

export interface BroadcastWithChannel extends Broadcast {
	channels: {
		id: string
		name: string
		slug: string
		image: string | null
		description: string | null
	}
}

export interface PlayHistory {
	id: string
	track_id: string
	started_at: string
	ended_at?: string
	ms_played: number
	reason_start?: string
	reason_end?: string
	shuffle: boolean
	skipped: boolean
}

/**
 * Why a track started playing
 * - user_click_track: User clicked on a specific track
 * - user_next: User clicked next button
 * - user_prev: User clicked previous button
 * - play_channel: Started playing a channel (first track)
 * - auto_next: Automatic advance after track completed
 * - broadcast_sync: Synced from broadcast
 * - play_search: Started from search results
 * - track_error: Previous track had error, auto-advancing
 */
export type PlayStartReason =
	| 'user_click_track'
	| 'user_next'
	| 'user_prev'
	| 'play_channel'
	| 'auto_next'
	| 'broadcast_sync'
	| 'play_search'
	| 'track_error'

/**
 * Why a track stopped playing
 * - track_completed: Track played to the end naturally
 * - user_next: User clicked next button
 * - user_prev: User clicked previous button
 * - user_stop: User clicked stop/pause
 * - playlist_change: Playlist/queue changed while playing
 * - youtube_error: YouTube player error (stored as youtube_error_${code} with specific error codes)
 * - broadcast_sync: Stopped due to broadcast sync
 */
export type PlayEndReason =
	| 'track_completed'
	| 'user_next'
	| 'user_prev'
	| 'user_stop'
	| 'playlist_change'
	| 'youtube_error'
	| 'broadcast_sync'

export interface Ok<T> {
	ok: true
	value: T
}

export interface Err<E> {
	ok: false
	error: E
}

export function ok<T>(value: T): Ok<T> {
	return {
		ok: true,
		value
	}
}

export function err<T>(error: T): Err<T> {
	return {
		ok: false,
		error
	}
}
