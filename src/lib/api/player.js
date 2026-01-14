import {playTrack} from '$lib/api'
import {appState} from '$lib/app-state.svelte'
import {logger} from '$lib/logger'
import {queueNext, queuePrev} from '$lib/player/queue'
import {shuffleArray} from '$lib/utils.ts'

/** @typedef {import('$lib/types').AppState} AppState */
/** @typedef {import('$lib/types').Track} Track */
/** @typedef {import('$lib/types').Channel} Channel */
/** @typedef {import('$lib/types').PlayEndReason} PlayEndReason */
/** @typedef {import('$lib/types').PlayStartReason} PlayStartReason */
/** @typedef {HTMLElement & {paused: boolean, play(): Promise<void> | void, pause(): void}} MediaPlayer */

const log = logger.ns('api/player').seal()

/** @param {MediaPlayer | null} [player] */
export function play(player) {
	// If no player provided, try to find one
	if (!player) {
		const el = document.querySelector('youtube-video') || document.querySelector('soundcloud-player')
		if (el && 'paused' in el) player = /** @type {MediaPlayer} */ (el)
	}

	if (!player) {
		log.warn('Media player not ready')
		return Promise.reject(new Error('Media player not ready'))
	}

	log.debug('play() check', player, 'paused?', player.paused)

	const result = player.play()
	if (result instanceof Promise) {
		return result
			.then(() => {
				log.log('play() succeeded')
			})
			.catch((error) => {
				log.warn('play() was prevented:', error.message || error)
				throw error
			})
	}
	return Promise.resolve()
}

/** @param {MediaPlayer} player */
export function pause(player) {
	if (!player) {
		log.warn('Media player not ready')
		return
	}
	player.pause()
}

/** @param {MediaPlayer} player */
export function togglePlay(player) {
	if (!player) {
		log.warn('Media player not ready')
		return
	}
	if (player.paused) {
		play(player)
	} else {
		pause(player)
	}
}

/**
 * @param {Track | undefined} track
 * @param {string[]} activeQueue - we need to know whether we're playing the playlist_tracks or playlist_tracks_shuffled
 * @param {PlayEndReason} endReason - why the current track is ending
 */
export function next(track, activeQueue, endReason) {
	if (!track?.id) {
		log.warn('No current track')
		return
	}
	if (!activeQueue?.length) {
		log.warn('No active queue')
		return
	}
	const nextId = queueNext(activeQueue, track.id)
	if (nextId) {
		/** @type {PlayStartReason} */
		const startReason = endReason === 'youtube_error' ? 'track_error' : 'auto_next'
		playTrack(nextId, endReason, startReason)
	} else {
		log.info('No next track available')
	}
}

/**
 * @param {Track | undefined} track
 * @param {string[]} activeQueue
 * @param {PlayEndReason} endReason
 */
export function previous(track, activeQueue, endReason) {
	if (!track?.id) {
		log.warn('No current track')
		return
	}
	if (!activeQueue?.length) {
		log.warn('No active queue')
		return
	}
	const prevId = queuePrev(activeQueue, track.id)
	if (prevId) {
		playTrack(prevId, endReason, 'user_prev')
	} else {
		log.info('No previous track available')
	}
}

export function toggleShuffle() {
	appState.shuffle = !appState.shuffle
	if (appState.shuffle) {
		appState.playlist_tracks_shuffled = shuffleArray(appState.playlist_tracks || [])
	}
}

export function toggleVideo() {
	appState.show_video_player = !appState.show_video_player
}

export function eject() {
	appState.playlist_track = undefined
	appState.playlist_tracks = []
	appState.playlist_tracks_shuffled = []
	appState.show_video_player = false
	appState.shuffle = false
	appState.is_playing = false
}
