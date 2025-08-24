import {err, ok} from './types.js'

/**
 * Process items in batches with concurrency control
 * @template T, R
 * @param {T[]} items
 * @param {(item: T) => Promise<R>} fn
 * @param {Object} options
 * @param {number} [options.batchSize=50] - Items per batch (batches run sequentially)
 * @param {number|'unbounded'} [options.withinBatch=1] - Concurrency within each batch
 * @returns {Promise<Array<import('./types.js').Ok<R> | import('./types.js').Err<any>>>}
 */
export async function batcher(items, fn, {batchSize = 50, withinBatch = 1} = {}) {
	const results = []
	const totalBatches = Math.ceil(items.length / batchSize)

	console.log(
		`batcher: processing ${items.length} items in ${totalBatches} batches (batchSize: ${batchSize}, withinBatch: ${withinBatch})`
	)

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize)
		const batchNum = Math.floor(i / batchSize) + 1

		console.log(`batcher: batch ${batchNum}/${totalBatches} - processing ${batch.length} items`)

		if (withinBatch === 'unbounded' || withinBatch >= batch.length) {
			// Process batch in parallel
			const promises = batch.map(fn)
			const batchResults = await Promise.allSettled(promises)
			results.push(...batchResults.map((r) => (r.status === 'fulfilled' ? ok(r.value) : err(r.reason))))
		} else if (withinBatch === 1) {
			// Sequential processing
			for (const item of batch) {
				try {
					const result = await fn(item)
					results.push(ok(result))
				} catch (error) {
					results.push(err(error))
				}
			}
		} else {
			// Limited concurrency within batch
			for (let j = 0; j < batch.length; j += withinBatch) {
				const chunk = batch.slice(j, j + withinBatch)
				const promises = chunk.map(fn)
				const chunkResults = await Promise.allSettled(promises)
				results.push(...chunkResults.map((r) => (r.status === 'fulfilled' ? ok(r.value) : err(r.reason))))
			}
		}

		// Yield to UI thread between batches
		if (i + batchSize < items.length) {
			await new Promise((resolve) => setTimeout(resolve, 0))
		}
	}

	return results
}
