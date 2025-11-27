import type {AppState} from '$lib/types'

const STORAGE_KEY = 'r5-tanstack-app-state'

export const defaultAppState: AppState = {
	id: 1,
	counter: 0,

	channels: [],
	custom_css_variables: {},
	shortcuts: {},

	channels_display: 'grid',
	channels_filter: '20+',
	channels_shuffled: true,
	queue_panel_visible: false,
	show_video_player: true,
	player_expanded: false,

	playlist_track: undefined,
	playlist_tracks: [],
	playlist_tracks_shuffled: [],

	is_playing: false,
	shuffle: false,
	volume: 0.7,

	broadcasting_channel_id: undefined,
	listening_to_channel_id: undefined,

	theme: undefined,
	hide_track_artwork: false,

	user: undefined,

	language: undefined
}

export const appState: AppState = $state({...defaultAppState})

let initialized = false

export async function initAppState() {
	if (initialized) return
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) {
			const parsed = JSON.parse(stored)
			// Always reset is_playing on load
			parsed.is_playing = false
			Object.assign(appState, parsed)
		}
	} catch (err) {
		console.warn('Failed to load app state from localStorage:', err)
	}
	initialized = true
}

export async function persistAppState() {
	if (!initialized) return
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(appState))
	} catch (err) {
		console.warn('Failed to persist app state:', err)
	}
}
