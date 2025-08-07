import {pg} from '$lib/db'
import {logger} from '$lib/logger'
import type {AppState} from './types'
const log = logger.ns('app_state').seal()

export const defaultAppState = {
	id: 1,
	counter: 0,

	channels: [],
	custom_css_variables: {},
	shortcuts: {},

	channels_display: 'grid',
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

	theme: 'dark',
	hide_track_artwork: false
}

export const appState: AppState = $state({...defaultAppState})

let initialized = false

// Initialize from database
export async function initAppState() {
	if (initialized) return
	try {
		const result = await pg.query('SELECT * FROM app_state WHERE id = 1')
		log.log('init', result.rows[0])
		if (result.rows[0]) {
			Object.assign(appState, result.rows[0])
		}
	} catch (err) {
		log.warn('Failed to load app state from db:', err)
	}
	initialized = true
}

// Persist to database
export async function persistAppState() {
	if (!initialized) return
	try {
		// see $lib/types appState
		const channelsArray =
			appState.channels.length > 0
				? `ARRAY[${appState.channels.map((id) => `'${id}'`).join(',')}]::uuid[]`
				: 'ARRAY[]::uuid[]'
		const playlistTracksArray =
			appState.playlist_tracks.length > 0
				? `ARRAY[${appState.playlist_tracks.map((id) => `'${id}'`).join(',')}]::uuid[]`
				: 'ARRAY[]::uuid[]'
		const playlistTracksShuffledArray =
			appState.playlist_tracks_shuffled.length > 0
				? `ARRAY[${appState.playlist_tracks_shuffled.map((id) => `'${id}'`).join(',')}]::uuid[]`
				: 'ARRAY[]::uuid[]'

		await pg.exec(`
			INSERT INTO app_state (
				id, queue_panel_visible, theme, volume, counter, is_playing, shuffle, 
				show_video_player, channels_display, playlist_track, broadcasting_channel_id, 
				listening_to_channel_id, playlist_tracks, playlist_tracks_shuffled, channels, 
				player_expanded, shortcuts, custom_css_variables, hide_track_artwork
			)
			VALUES (
				${appState.id}, 
				${appState.queue_panel_visible}, 
				'${appState.theme}', 
				${appState.volume}, 
				${appState.counter}, 
				${appState.is_playing}, 
				${appState.shuffle}, 
				${appState.show_video_player}, 
				${appState.channels_display ? `'${appState.channels_display}'` : 'NULL'}, 
				${appState.playlist_track ? `'${appState.playlist_track}'` : 'NULL'}, 
				${appState.broadcasting_channel_id ? `'${appState.broadcasting_channel_id}'` : 'NULL'}, 
				${appState.listening_to_channel_id ? `'${appState.listening_to_channel_id}'` : 'NULL'}, 
				${playlistTracksArray}, 
				${playlistTracksShuffledArray}, 
				${channelsArray}, 
				${appState.player_expanded || false}, 
				'${JSON.stringify(appState.shortcuts)}', 
				'${JSON.stringify(appState.custom_css_variables)}',
				${appState.hide_track_artwork || false}
			)
			ON CONFLICT (id) DO UPDATE SET
				queue_panel_visible = EXCLUDED.queue_panel_visible,
				theme = EXCLUDED.theme,
				volume = EXCLUDED.volume,
				counter = EXCLUDED.counter,
				is_playing = EXCLUDED.is_playing,
				shuffle = EXCLUDED.shuffle,
				show_video_player = EXCLUDED.show_video_player,
				channels_display = EXCLUDED.channels_display,
				playlist_track = EXCLUDED.playlist_track,
				broadcasting_channel_id = EXCLUDED.broadcasting_channel_id,
				listening_to_channel_id = EXCLUDED.listening_to_channel_id,
				playlist_tracks = EXCLUDED.playlist_tracks,
				playlist_tracks_shuffled = EXCLUDED.playlist_tracks_shuffled,
				channels = EXCLUDED.channels,
				player_expanded = EXCLUDED.player_expanded,
				shortcuts = EXCLUDED.shortcuts,
				custom_css_variables = EXCLUDED.custom_css_variables,
				hide_track_artwork = EXCLUDED.hide_track_artwork
		`)
	} catch (err) {
		log.warn('Failed to persist app state:', err)
	}
}
