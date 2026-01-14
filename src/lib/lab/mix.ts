/**
 * Mix builder - fluent API for creating playlists.
 *
 * Example:
 *   mix()
 *     .from('starttv')
 *     .from('otherChannel')
 *     .shuffle()
 *     .take(50)
 *     .play()
 */

import {tracksCollection} from '$lib/tanstack/collections'
import {appState} from '$lib/app-state.svelte'
import {playTrack, setPlaylist} from '$lib/api'
import {queueShuffle, queueUnique, queueInterleave, queueConcat, queueRepeat} from '$lib/player/queue'
import {searchTracks} from '$lib/search'

type Track = {
	id: string
	slug?: string | null
	created_at: string
	url?: string
	playback_error?: string | null
	tags?: string[] | null
	mentions?: string[] | null
	description?: string | null
}

export interface Mix {
	ids: () => string[]
	tracks: () => Track[]
	count: () => number
	clone: () => Mix
	from: (slug: string) => Mix
	add: (...trackIds: string[]) => Mix
	shuffle: () => Mix
	reverse: () => Mix
	unique: () => Mix
	take: (n: number) => Mix
	skip: (n: number) => Mix
	repeat: (times: number) => Mix
	interleave: (other: Mix | string[]) => Mix
	concat: (other: Mix | string[]) => Mix
	sortNewest: () => Mix
	sortOldest: () => Mix
	where: (predicate: (t: Track) => boolean) => Mix
	withoutErrors: () => Mix
	youtube: () => Mix
	soundcloud: () => Mix
	recent: (days: number) => Mix
	withTag: (tag: string) => Mix
	withMention: (mention: string) => Mix
	when: (condition: boolean | (() => boolean), action: (m: Mix) => Mix) => Mix
	unless: (condition: boolean | (() => boolean), action: (m: Mix) => Mix) => Mix
	tap: (fn: (tracks: Track[]) => void) => Mix
	log: (label?: string) => Mix
	play: () => Promise<void>
	queue: () => void
	queueNext: () => void
}

function getTracksBySlug(slug: string): Track[] {
	return [...tracksCollection.state.values()].filter((t) => t.slug === slug) as Track[]
}

function sortByCreated(tracks: Track[], direction: 'asc' | 'desc'): Track[] {
	const mult = direction === 'desc' ? -1 : 1
	return [...tracks].sort((a, b) => mult * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
}

function createMix(initial: Track[] = []): Mix {
	let tracks = [...initial]

	const self: Mix = {
		ids: () => tracks.map((t) => t.id),
		tracks: () => [...tracks],
		count: () => tracks.length,
		clone: () => createMix([...tracks]),

		from(slug: string) {
			const channelTracks = getTracksBySlug(slug)
			tracks = [...tracks, ...channelTracks]
			return self
		},

		add(...trackIds: string[]) {
			for (const id of trackIds) {
				const track = tracksCollection.get(id) as Track | undefined
				if (track) tracks.push(track)
			}
			return self
		},

		shuffle() {
			const ids = queueShuffle(tracks.map((t) => t.id))
			tracks = ids.map((id) => tracks.find((t) => t.id === id)!).filter(Boolean)
			return self
		},

		reverse() {
			tracks = [...tracks].reverse()
			return self
		},

		unique() {
			const ids = queueUnique(tracks.map((t) => t.id))
			tracks = ids.map((id) => tracks.find((t) => t.id === id)!).filter(Boolean)
			return self
		},

		take(n: number) {
			tracks = tracks.slice(0, n)
			return self
		},

		skip(n: number) {
			tracks = tracks.slice(n)
			return self
		},

		repeat(times: number) {
			const ids = queueRepeat(
				tracks.map((t) => t.id),
				times
			)
			const trackMap = new Map(tracks.map((t) => [t.id, t]))
			tracks = ids.map((id) => trackMap.get(id)!).filter(Boolean)
			return self
		},

		interleave(other: Mix | string[]) {
			const otherIds = Array.isArray(other) ? other : other.ids()
			const ids = queueInterleave(
				tracks.map((t) => t.id),
				otherIds
			)
			const allTracks = [...tracksCollection.state.values()] as Track[]
			const trackMap = new Map(allTracks.map((t) => [t.id, t]))
			tracks = ids.map((id) => trackMap.get(id)!).filter(Boolean)
			return self
		},

		concat(other: Mix | string[]) {
			const otherIds = Array.isArray(other) ? other : other.ids()
			const ids = queueConcat(
				tracks.map((t) => t.id),
				otherIds
			)
			const allTracks = [...tracksCollection.state.values()] as Track[]
			const trackMap = new Map(allTracks.map((t) => [t.id, t]))
			tracks = ids.map((id) => trackMap.get(id)!).filter(Boolean)
			return self
		},

		sortNewest() {
			tracks = sortByCreated(tracks, 'desc')
			return self
		},

		sortOldest() {
			tracks = sortByCreated(tracks, 'asc')
			return self
		},

		where(predicate: (t: Track) => boolean) {
			tracks = tracks.filter(predicate)
			return self
		},

		withoutErrors() {
			tracks = tracks.filter((t) => !t.playback_error)
			return self
		},

		youtube() {
			tracks = tracks.filter((t) => t.url?.includes('youtube.com') || t.url?.includes('youtu.be'))
			return self
		},

		soundcloud() {
			tracks = tracks.filter((t) => t.url?.includes('soundcloud.com'))
			return self
		},

		recent(days: number) {
			const threshold = Date.now() - days * 24 * 60 * 60 * 1000
			tracks = tracks.filter((t) => new Date(t.created_at).getTime() >= threshold)
			return self
		},

		withTag(tag: string) {
			const normalized = tag.toLowerCase().replace(/^#/, '')
			tracks = tracks.filter((t) => {
				if (t.tags?.some((x) => x.toLowerCase() === normalized)) return true
				return t.description?.toLowerCase().includes(`#${normalized}`)
			})
			return self
		},

		withMention(mention: string) {
			const normalized = mention.toLowerCase().replace(/^@/, '')
			tracks = tracks.filter((t) => {
				if (t.mentions?.some((x) => x.toLowerCase() === normalized)) return true
				return t.description?.toLowerCase().includes(`@${normalized}`)
			})
			return self
		},

		when(condition: boolean | (() => boolean), action: (m: Mix) => Mix) {
			const cond = typeof condition === 'function' ? condition() : condition
			if (cond) {
				const result = action(self)
				tracks = result.tracks()
			}
			return self
		},

		unless(condition: boolean | (() => boolean), action: (m: Mix) => Mix) {
			const cond = typeof condition === 'function' ? condition() : condition
			if (!cond) {
				const result = action(self)
				tracks = result.tracks()
			}
			return self
		},

		tap(fn: (tracks: Track[]) => void) {
			fn([...tracks])
			return self
		},

		log(label?: string) {
			console.log(label || 'mix', {count: tracks.length, tracks: [...tracks]})
			return self
		},

		async play() {
			const ids = self.ids()
			if (!ids.length) return
			setPlaylist(ids)
			await playTrack(ids[0], null, 'play_channel')
		},

		queue() {
			const ids = self.ids()
			if (!ids.length) return
			setPlaylist(ids)
		},

		queueNext() {
			const ids = self.ids()
			if (!ids.length) return
			const current = appState.playlist_track
			if (!current) {
				setPlaylist(ids)
				return
			}
			const currentIdx = appState.playlist_tracks.indexOf(current)
			const before = appState.playlist_tracks.slice(0, currentIdx + 1)
			const after = appState.playlist_tracks.slice(currentIdx + 1)
			appState.playlist_tracks = [...before, ...ids, ...after]
		}
	}

	return self
}

/** Start a new mix */
export function mix(): Mix {
	return createMix()
}

/** Start a mix from a channel */
export function mixFrom(slug: string): Mix {
	return createMix().from(slug)
}

/** Start a mix from specific track IDs */
export function mixIds(...ids: string[]): Mix {
	return createMix().add(...ids)
}

/** Start a mix from the current queue */
export function mixCurrent(): Mix {
	const currentIds = appState.playlist_tracks || []
	const allTracks = [...tracksCollection.state.values()] as Track[]
	const trackMap = new Map(allTracks.map((t) => [t.id, t]))
	const tracks = currentIds.map((id) => trackMap.get(id)).filter(Boolean) as Track[]
	return createMix(tracks)
}

/** Start a mix from all loaded tracks */
export function mixAll(): Mix {
	const allTracks = [...tracksCollection.state.values()] as Track[]
	return createMix(allTracks)
}

/** Start a mix from remaining queue (after current track) */
export function mixRemaining(): Mix {
	const current = appState.playlist_track
	const currentIds = appState.playlist_tracks || []
	const idx = current ? currentIds.indexOf(current) : -1
	const remainingIds = idx >= 0 ? currentIds.slice(idx + 1) : currentIds
	const allTracks = [...tracksCollection.state.values()] as Track[]
	const trackMap = new Map(allTracks.map((t) => [t.id, t]))
	const tracks = remainingIds.map((id) => trackMap.get(id)).filter(Boolean) as Track[]
	return createMix(tracks)
}

/** Build a mix from search results (async) */
export async function mixSearch(query: string, options?: {limit?: number; channelSlug?: string}): Promise<Mix> {
	const results = await searchTracks(query, options)
	// Write to collection so playTrack can find them
	tracksCollection.utils.writeBatch(() => {
		for (const track of results) {
			tracksCollection.utils.writeUpsert(track)
		}
	})
	return createMix(results as Track[])
}
