import * as batchEdit from './batch-edit.js'
import {appState, defaultAppState} from '$lib/app-state.svelte'
import {leaveBroadcast} from '$lib/broadcast'
import {logger} from '$lib/logger'
import {needsUpdate} from '$lib/sync'
import {pg, dropDb, migrateDb} from '$lib/db'
import {r4} from '$lib/r4'
import {r5} from '$lib/experimental-api'
import {shuffleArray} from '$lib/utils'
import {syncFollowers, pullFollowers} from '$lib/sync/followers'

const log = logger.ns('api').seal()

/** @typedef {object} User
 * @prop {string} id
 * @prop {string} email
 */

export async function checkUser() {
	try {
		const user = await r4.users.readUser()
		if (!user) {
			appState.channels = []
			appState.broadcasting_channel_id = undefined
			return null
		}

		const channels = await r4.channels.readUserChannels()
		const wasSignedOut = !appState.channels?.length
		appState.channels = channels.map((/** @type {any} */ c) => c.id)

		// Sync followers when user signs in (not on every check)
		if (wasSignedOut && appState.channels.length) {
			syncFollowers(appState.channels[0]).catch((err) =>
				log.error('sync_followers_on_signin_error', err)
			)
		}
		return user
	} catch (err) {
		log.warn('check_user_error', err)
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
	leaveBroadcast()
	if (await needsUpdate(slug)) await r5.pull.channel({slug})
	const tracks = (
		await pg.sql`select * from tracks where channel_id = ${id} order by created_at desc`
	).rows
	const ids = tracks.map((t) => t.id)
	await setPlaylist(ids)
	await playTrack(tracks[index].id, '', 'play_channel')
}

/** @param {string[]} ids */
export async function setPlaylist(ids) {
	appState.playlist_tracks = ids
	appState.playlist_tracks_shuffled = shuffleArray(ids)
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

export async function resetDatabase() {
	Object.assign(appState, defaultAppState)
	await new Promise((resolve) => setTimeout(resolve, 100))
	await dropDb()
	await migrateDb()
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

/**
 * @param {string} followerId - ID of the user's channel
 * @param {string} channelId - ID of the channel to follow
 */
export async function addFollower(followerId, channelId) {
	await pg.sql`
		INSERT INTO followers (follower_id, channel_id, created_at, synced_at)
		VALUES (${followerId}, ${channelId}, CURRENT_TIMESTAMP, NULL)
		ON CONFLICT (follower_id, channel_id) DO NOTHING
	`
}

/**
 * @param {string} followerId - ID of the user's channel
 * @param {string} channelId - ID of the channel to unfollow
 */
export async function removeFollower(followerId, channelId) {
	await pg.sql`
		DELETE FROM followers 
		WHERE follower_id = ${followerId} AND channel_id = ${channelId}
	`
}

/**
 * @param {string} followerId - ID of the user's channel
 * @returns {Promise<import('$lib/types').Channel[]>}
 */
export async function queryFollowers(followerId) {
	const {rows} = await pg.sql`
		SELECT c.*
		FROM followers f
		JOIN channels c ON f.channel_id = c.id
		WHERE f.follower_id = ${followerId}
		ORDER BY f.created_at DESC
	`
	return rows
}

/**
 * Ensure followers are loaded for a user, auto-pulling if needed
 * @param {string} followerId - ID of the user's channel
 * @returns {Promise<import('$lib/types').Channel[]>}
 */
export async function ensureFollowers(followerId) {
	const existing = await queryFollowers(followerId)
	if (existing.length === 0 && followerId !== 'local-user') {
		await pullFollowers(followerId)
		return await queryFollowers(followerId)
	}
	return existing
}

/**
 * @param {string} followerId - ID of the user's channel
 * @param {string} channelId - ID of the channel to check
 * @returns {Promise<boolean>}
 */
export async function isFollowing(followerId, channelId) {
	const {rows} = await pg.sql`
		SELECT 1 FROM followers 
		WHERE follower_id = ${followerId} AND channel_id = ${channelId}
		LIMIT 1
	`
	return rows.length > 0
}
