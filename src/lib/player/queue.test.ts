import {describe, expect, it} from 'vitest'
import {
	queueNext,
	queuePrev,
	queueInsertManyAfter,
	queueRemove,
	queueShuffle,
	queueShuffleKeepCurrent,
	queueRotate,
	queuePosition,
	queueUnique,
	queueRepeat,
	queueInterleave,
	queueConcat
} from './queue'

const queue = ['a', 'b', 'c', 'd', 'e']

describe('queue navigation', () => {
	it('queueNext returns next item', () => {
		expect(queueNext(queue, 'b')).toBe('c')
		expect(queueNext(queue, 'e')).toBeNull()
		expect(queueNext(queue, 'x')).toBeNull()
	})

	it('queuePrev returns previous item', () => {
		expect(queuePrev(queue, 'c')).toBe('b')
		expect(queuePrev(queue, 'a')).toBeNull()
		expect(queuePrev(queue, 'x')).toBeNull()
	})

	it('queuePosition returns 1-indexed position', () => {
		expect(queuePosition(queue, 'a')).toBe(1)
		expect(queuePosition(queue, 'c')).toBe(3)
		expect(queuePosition(queue, 'x')).toBe(0)
	})
})

describe('queue insertion', () => {
	it('queueInsertManyAfter inserts multiple items', () => {
		expect(queueInsertManyAfter(queue, 'b', ['x', 'y'])).toEqual(['a', 'b', 'x', 'y', 'c', 'd', 'e'])
		expect(queueInsertManyAfter(queue, 'missing', ['x'])).toEqual(['a', 'b', 'c', 'd', 'e', 'x'])
	})
})

describe('queue removal', () => {
	it('queueRemove removes single item', () => {
		expect(queueRemove(queue, 'c')).toEqual(['a', 'b', 'd', 'e'])
		expect(queueRemove(queue, 'x')).toEqual(queue)
	})
})

describe('queue shuffle', () => {
	it('queueShuffle returns same length', () => {
		const shuffled = queueShuffle(queue)
		expect(shuffled.length).toBe(queue.length)
		expect(shuffled.sort()).toEqual([...queue].sort())
	})

	it('queueShuffleKeepCurrent keeps current at front', () => {
		const shuffled = queueShuffleKeepCurrent(queue, 'c')
		expect(shuffled[0]).toBe('c')
		expect(shuffled.length).toBe(queue.length)
	})
})

describe('queue manipulation', () => {
	it('queueRotate moves items before current to end', () => {
		expect(queueRotate(queue, 'c')).toEqual(['c', 'd', 'e', 'a', 'b'])
		expect(queueRotate(queue, 'a')).toEqual(queue)
		expect(queueRotate(queue, 'x')).toEqual(queue)
	})

	it('queueUnique removes duplicates', () => {
		expect(queueUnique(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
	})

	it('queueRepeat repeats queue N times', () => {
		expect(queueRepeat(['a', 'b'], 3)).toEqual(['a', 'b', 'a', 'b', 'a', 'b'])
		expect(queueRepeat(queue, 0)).toEqual([])
		expect(queueRepeat(queue, 1)).toEqual(queue)
	})

	it('queueInterleave interleaves two queues', () => {
		expect(queueInterleave(['a', 'b', 'c'], ['1', '2', '3'])).toEqual(['a', '1', 'b', '2', 'c', '3'])
		expect(queueInterleave(['a', 'b'], ['1', '2', '3'])).toEqual(['a', '1', 'b', '2', '3'])
		expect(queueInterleave(['a', 'b', 'c'], ['1'])).toEqual(['a', '1', 'b', 'c'])
	})

	it('queueConcat concatenates queues', () => {
		expect(queueConcat(['a', 'b'], ['c', 'd'])).toEqual(['a', 'b', 'c', 'd'])
		expect(queueConcat(['a'], ['b'], ['c'])).toEqual(['a', 'b', 'c'])
	})
})
