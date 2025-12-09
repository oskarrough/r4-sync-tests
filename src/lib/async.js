/**
 * Process items in chunks with concurrency, yielding results as they complete
 * @template T, R
 * @param {T[]} items
 * @param {(chunk: T[], signal?: AbortSignal) => Promise<R>} fn - receives AbortSignal if provided
 * @param {{chunk?: number, concurrency?: number, signal?: AbortSignal}} options
 * @yields {{ok: true, value: R} | {ok: false, error: Error}}
 */
export async function* mapChunked(items, fn, {chunk = 50, concurrency = 3, signal} = {}) {
	const chunks = []
	for (let i = 0; i < items.length; i += chunk) {
		chunks.push(items.slice(i, i + chunk))
	}

	const pending = new Map()
	let nextKey = 0
	let nextChunk = 0

	while (nextChunk < chunks.length || pending.size > 0) {
		if (signal?.aborted) {
			for (let i = nextChunk; i < chunks.length; i++) {
				yield {ok: false, error: new DOMException('Aborted', 'AbortError')}
			}
			break
		}

		while (pending.size < concurrency && nextChunk < chunks.length) {
			const key = nextKey++
			const chunkData = chunks[nextChunk++]

			const promise = fn(chunkData, signal)
				.then((value) => ({ok: true, value, key}))
				.catch((error) => ({ok: false, error, key}))

			pending.set(key, promise)
		}

		if (pending.size > 0) {
			const result = await Promise.race(pending.values())
			pending.delete(result.key)
			yield result.ok ? {ok: true, value: result.value} : {ok: false, error: result.error}
		}
	}
}
