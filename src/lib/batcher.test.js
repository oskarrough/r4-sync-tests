import {test, expect} from 'vitest'
import {batcher} from './batcher.js'

test('basic batching with default options', async () => {
	const items = [1, 2, 3]
	const results = await batcher(items, (x) => Promise.resolve(x * 2))
	expect(results).toEqual([
		{ok: true, value: 2},
		{ok: true, value: 4},
		{ok: true, value: 6}
	])
})

test('custom batch size', async () => {
	const items = [1, 2, 3]
	const results = await batcher(items, (x) => Promise.resolve(x * 2), {batchSize: 2})
	expect(results).toEqual([
		{ok: true, value: 2},
		{ok: true, value: 4},
		{ok: true, value: 6}
	])
})

test('unbounded concurrency', async () => {
	const items = [1, 2, 3]
	const results = await batcher(items, (x) => Promise.resolve(x * 2), {withinBatch: 'unbounded'})
	expect(results).toEqual([
		{ok: true, value: 2},
		{ok: true, value: 4},
		{ok: true, value: 6}
	])
})

test('limited concurrency', async () => {
	const items = [1, 2, 3]
	const results = await batcher(items, (x) => Promise.resolve(x * 2), {withinBatch: 2})
	expect(results).toEqual([
		{ok: true, value: 2},
		{ok: true, value: 4},
		{ok: true, value: 6}
	])
})

test('error handling with unbounded concurrency', async () => {
	const items = [1, 2, 3]
	const fn = (x) => (x === 2 ? Promise.reject(new Error('fail')) : Promise.resolve(x * 2))

	const results = await batcher(items, fn, {withinBatch: 'unbounded'})
	expect(results[0]).toEqual({ok: true, value: 2})
	expect(results[1].ok).toBe(false)
	expect(results[2]).toEqual({ok: true, value: 6})
})

test('error handling with sequential processing', async () => {
	const items = [1, 2, 3]
	const fn = (x) => (x === 2 ? Promise.reject(new Error('fail')) : Promise.resolve(x * 2))

	const results = await batcher(items, fn, {withinBatch: 1})
	expect(results).toEqual([
		{ok: true, value: 2},
		{ok: false, error: expect.any(Error)},
		{ok: true, value: 6}
	])
})

test('empty items array', async () => {
	const results = await batcher([], (x) => Promise.resolve(x))
	expect(results).toEqual([])
})

test('batch size larger than item count', async () => {
	const items = [1, 2, 3]
	const results = await batcher(items, (x) => Promise.resolve(x * 2), {batchSize: 100})
	expect(results).toEqual([
		{ok: true, value: 2},
		{ok: true, value: 4},
		{ok: true, value: 6}
	])
})

test('batch API pattern', async () => {
	const batches = [['id1', 'id2'], ['id3']]
	const mockAPI = async (batch) => batch.map((id) => ({id, data: `processed-${id}`}))

	const results = await batcher(batches, mockAPI)

	expect(results).toEqual([
		{
			ok: true,
			value: [
				{id: 'id1', data: 'processed-id1'},
				{id: 'id2', data: 'processed-id2'}
			]
		},
		{ok: true, value: [{id: 'id3', data: 'processed-id3'}]}
	])
})
