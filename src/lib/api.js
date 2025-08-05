import {pg} from '$lib/db'
import {needsUpdate, pullTracks} from '$lib/sync'
import {sdk} from '@radio4000/sdk'
import {leaveBroadcast} from '$lib/broadcast'
import {logger} from '$lib/logger'
import {shuffleArray} from '$lib/utils'
import {appState} from '$lib/app-state.svelte'

const log = logger.ns('api').seal()

/** @typedef {object} User
 * @prop {string} id
 * @prop {string} email
 */

export async function checkUser() {
	try {
		const {data: user, error} = await sdk.users.readUser()
		log.log('check_user', user, error)
		if (!user) {
			appState.channels = []
		} else {
			const {data: channels} = await sdk.channels.readUserChannels()
			log.log('check_user', {channels})
			if (channels) {
				appState.channels = channels.map((/** @type {any} */ c) => c.id)
			}
			return user
		}
	} catch (err) {
		log.error('check_user_error', err)
	}
}

/**
 * @param {string} id
 * @param {string} endReason
 * @param {string} startReason
 */
export async function playTrack(id, endReason, startReason) {
	log.log('play_track', {id, endReason, startReason})

	const track = (await pg.sql`SELECT * FROM tracks WHERE id = ${id}`).rows[0]
	if (!track) throw new Error(`play_track:error Failed to play track: ${id}`)

	// Get current track before we change it
	const previousTrackId = appState.playlist_track

	const tracks = (
		await pg.sql`select id from tracks where channel_id = ${track.channel_id} order by created_at desc`
	).rows
	const ids = tracks.map((t) => t.id)
	await setPlaylist(ids)
	appState.playlist_track = id
	await addPlayHistory({nextTrackId: id, previousTrackId, endReason, startReason})
}

/**
 * @param {import('$lib/types').Channel} channel
 * @param {number} index
 */
export async function playChannel({id, slug}, index = 0) {
	log.log('play_channel', {id, slug})
	await leaveBroadcast() // actually only needed if we're listening
	if (await needsUpdate(slug)) await pullTracks(slug)
	const tracks = (
		await pg.sql`select * from tracks where channel_id = ${id} order by created_at desc`
	).rows
	const ids = tracks.map((t) => t.id)
	await setPlaylist(ids)
	await playTrack(tracks[index].id, '', 'play_channel')
}

/** @param {string[]} ids */
export async function setPlaylist(ids) {
	const isShuffled = appState.shuffle || false

	appState.playlist_tracks = ids
	if (isShuffled) {
		appState.playlist_tracks_shuffled = shuffleArray(ids)
	}
}

/** @returns {Promise<import('$lib/types').BroadcastWithChannel[]>} */
export async function readBroadcastsWithChannel() {
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
	// @ts-expect-error supabase typing issue with nested relations
	return data || []
}

/** @param {string[]} trackIds */
export async function addToPlaylist(trackIds) {
	const currentTracks = appState.playlist_tracks || []
	appState.playlist_tracks = [...currentTracks, ...trackIds]
}

export async function toggleTheme() {
	const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
	const newTheme = currentTheme === 'light' ? 'dark' : 'light'

	if (newTheme === 'dark') {
		document.documentElement.classList.remove('light')
		document.documentElement.classList.add('dark')
	} else {
		document.documentElement.classList.remove('dark')
		document.documentElement.classList.add('light')
	}
	appState.theme = newTheme
}

export async function toggleQueuePanel() {
	appState.queue_panel_visible = !appState.queue_panel_visible
}

export function togglePlayerExpanded() {
	appState.player_expanded = !appState.player_expanded
	appState.show_video_player = !appState.show_video_player
}

export function openSearch() {
	//goto('/search').then(() => {
	// Focus the search input after navigation
	setTimeout(() => {
		const searchInput = document.querySelector('header input[type="search"]')
		if (searchInput instanceof HTMLInputElement) searchInput.focus()
	}, 0)
	//})
}

export function togglePlayPause() {
	/** @type {HTMLElement & {paused: boolean, play(): void, pause(): void} | null} */
	const ytPlayer = document.querySelector('youtube-video')
	if (ytPlayer) {
		if (ytPlayer.paused) {
			ytPlayer.play()
		} else {
			ytPlayer.pause()
		}
	}
}

/**
 * @param {object} options
 * @param {string} options.previousTrackId
 * @param {string} options.nextTrackId
 * @param {string} options.endReason
 * @param {string} options.startReason
 */
export async function addPlayHistory({previousTrackId, nextTrackId, endReason, startReason}) {
	const {rows} = await pg.sql`SELECT shuffle FROM app_state WHERE id = 1`
	const shuffleState = rows[0]?.shuffle || false

	if (previousTrackId && previousTrackId !== nextTrackId && endReason) {
		const mediaController = document.querySelector('media-controller#r5')
		const actualPlayTime = mediaController?.getAttribute('mediacurrenttime')
		const msPlayed = actualPlayTime ? Math.round(Number.parseFloat(actualPlayTime) * 1000) : 0

		await pg.sql`
			UPDATE play_history
			SET ended_at = CURRENT_TIMESTAMP,
				ms_played = ${msPlayed},
				reason_end = ${endReason}
			WHERE track_id = ${previousTrackId} AND ended_at IS NULL
		`
	}

	// Start new track if reason provided
	if (startReason) {
		await pg.sql`
			INSERT INTO play_history (
				track_id, started_at, ended_at, ms_played,
				reason_start, reason_end, shuffle, skipped
			) VALUES (
				${nextTrackId}, CURRENT_TIMESTAMP, NULL, 0,
				${startReason}, NULL, ${shuffleState}, FALSE
			)
		`
	}
}

/** @param {string} trackId */
export async function queryTrackWithChannel(trackId) {
	const track = (await pg.sql`select * from tracks where id = ${trackId}`).rows[0]
	const channel = (await pg.sql`select * from channels where id = ${track.channel_id}`).rows[0]
	return {track, channel}
}

export async function queryChannelsWithTrackCounts() {
	const {rows} = await pg.sql`
		SELECT
			c.*,
			COUNT(t.id) as track_count
		FROM channels c
		LEFT JOIN tracks t ON c.id = t.channel_id
		GROUP BY c.id
		ORDER BY c.name
	`
	return rows
}

import * as batchEdit from './batch-edit.js'

export async function stageEdit(trackId, field, oldValue, newValue) {
	return batchEdit.stageEdit(pg, trackId, field, oldValue, newValue)
}

export async function commitEdits() {
	return batchEdit.commitEdits(pg)
}

export async function discardEdits() {
	return batchEdit.discardEdits(pg)
}

export async function getEditCount() {
	return batchEdit.getEditCount(pg)
}

export async function getEdits() {
	return batchEdit.getEdits(pg)
}
