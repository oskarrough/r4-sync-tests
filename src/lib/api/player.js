import {playTrack} from '$lib/api'
import {shuffleArray} from '$lib/utils'
import {appState} from '$lib/app-state.svelte'
import {logger} from '$lib/logger'

/** @typedef {import('$lib/types').AppState} AppState */
/** @typedef {import('$lib/types').Track} Track */
/** @typedef {import('$lib/types').Channel} Channel */
/** @typedef {HTMLElement & {paused: boolean, play(): void, pause(): void} | null} YouTubePlayer */

/** @param {YouTubePlayer} yt */
const log = logger.ns('player').seal()

export function play(yt) {
	if (!yt) {
		log.warn('YouTube player not ready')
		return
	}
	yt.play()
}

/** @param {YouTubePlayer} yt */
export function pause(yt) {
	if (!yt) {
		log.warn('YouTube player not ready')
		return
	}
	yt.pause()
}

/** @param {YouTubePlayer} yt */
export function togglePlay(yt) {
	if (!yt) {
		log.warn('YouTube player not ready')
		return
	}
	if (yt.paused) {
		play(yt)
	} else {
		pause(yt)
	}
}

/**
 * @param {Track | undefined} track
 * @param {string[]} activeQueue
 * @param {string} reason
 */
export function next(track, activeQueue, reason) {
	if (!track?.id) {
		log.warn('No current track')
		return
	}
	if (!activeQueue?.length) {
		log.warn('No active queue')
		return
	}
	const idx = activeQueue.indexOf(track.id)
	const next = activeQueue[idx + 1]
	if (next) {
		const startReason =
			reason === 'track_completed' || reason === 'youtube_error' ? 'auto_next' : reason
		playTrack(next, reason, startReason)
	} else {
		log.info('No next track available')
	}
}

/**
 * @param {Track | undefined} track
 * @param {string[]} activeQueue
 * @param {string} reason
 */
export function previous(track, activeQueue, reason) {
	if (!track?.id) {
		log.warn('No current track')
		return
	}
	if (!activeQueue?.length) {
		log.warn('No active queue')
		return
	}

	const idx = activeQueue.indexOf(track.id)
	const prev = activeQueue[idx - 1]
	if (prev) {
		playTrack(prev, reason, reason)
	} else {
		log.info('No previous track available')
	}
}

/**
 * @param {string[]} trackIds
 */
export function toggleShuffle(trackIds) {
	const newShuffleState = !appState.shuffle
	if (newShuffleState) {
		// Turning shuffle ON - generate new shuffle queue
		const shuffledQueue = shuffleArray(trackIds)
		appState.shuffle = true
		appState.playlist_tracks_shuffled = shuffledQueue
	} else {
		// Turning shuffle OFF - clear shuffle queue
		appState.shuffle = false
		appState.playlist_tracks_shuffled = []
	}
}

export function toggleVideo() {
	appState.show_video_player = !appState.show_video_player
}

export function eject() {
	appState.playlist_track = null
	appState.playlist_tracks = []
	appState.playlist_tracks_shuffled = []
	appState.show_video_player = false
	appState.shuffle = false
	appState.is_playing = false
}
