/**
 * Pure queue operations. No state mutation.
 * All functions return new arrays/values without side effects.
 */

import {shuffleArray} from '$lib/utils'

/** Returns the next track ID in queue, or null if at end */
export function queueNext(queue: string[], currentId: string): string | null {
	const idx = queue.indexOf(currentId)
	if (idx === -1) return null
	return queue[idx + 1] ?? null
}

/** Returns the previous track ID in queue, or null if at start */
export function queuePrev(queue: string[], currentId: string): string | null {
	const idx = queue.indexOf(currentId)
	if (idx <= 0) return null
	return queue[idx - 1]
}

/** Insert multiple IDs after current position */
export function queueInsertManyAfter(queue: string[], currentId: string, insertIds: string[]): string[] {
	const idx = queue.indexOf(currentId)
	if (idx === -1) return [...queue, ...insertIds]
	return [...queue.slice(0, idx + 1), ...insertIds, ...queue.slice(idx + 1)]
}

/** Remove ID from queue */
export function queueRemove(queue: string[], id: string): string[] {
	return queue.filter((i) => i !== id)
}

/** Shuffle but keep current track at front */
export function queueShuffleKeepCurrent(queue: string[], currentId: string): string[] {
	const rest = queue.filter((id) => id !== currentId)
	return [currentId, ...shuffleArray(rest)]
}

/** Rotate queue: move items before current to end (radio behavior) */
export function queueRotate(queue: string[], currentId: string): string[] {
	const idx = queue.indexOf(currentId)
	if (idx <= 0) return [...queue]
	return [...queue.slice(idx), ...queue.slice(0, idx)]
}

/** Deduplicate queue (keep first occurrence) */
export function queueUnique(queue: string[]): string[] {
	return [...new Set(queue)]
}

/** Repeat queue N times */
export function queueRepeat(queue: string[], times: number): string[] {
	const result: string[] = []
	for (let i = 0; i < times; i++) {
		result.push(...queue)
	}
	return result
}

/** Interleave two queues (A1, B1, A2, B2, ...) */
export function queueInterleave(a: string[], b: string[]): string[] {
	const result: string[] = []
	const maxLen = Math.max(a.length, b.length)
	for (let i = 0; i < maxLen; i++) {
		if (i < a.length) result.push(a[i])
		if (i < b.length) result.push(b[i])
	}
	return result
}

/** Concat multiple queues */
export function queueConcat(...queues: string[][]): string[] {
	return queues.flat()
}
