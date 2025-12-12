import {
	persistQueryClientRestore,
	persistQueryClientSubscribe,
	type PersistedClient
} from '@tanstack/query-persist-client-core'
import {get, set, del} from 'idb-keyval'
import {queryClient} from './collections'

// JSON stringify that strips functions and handles circular refs
// Required because syncMode: "on-demand" adds functions to query meta
// See https://github.com/TanStack/db/issues/901
function serialize(client: PersistedClient): string {
	const seen = new WeakSet()
	return JSON.stringify(client, (_key, value) => {
		if (typeof value === 'function') return undefined
		if (value && typeof value === 'object') {
			if (seen.has(value)) return undefined
			seen.add(value)
		}
		return value
	})
}

// IDB persister for query cache
const idbPersister = {
	persistClient: async (client: PersistedClient) => {
		await set('r5-query-cache', serialize(client))
	},
	restoreClient: async () => {
		const data = await get<string>('r5-query-cache')
		return data ? JSON.parse(data) : undefined
	},
	removeClient: async () => {
		await del('r5-query-cache')
	}
}

const persistOptions = {
	queryClient,
	persister: idbPersister,
	maxAge: 24 * 60 * 60 * 1000, // 24h - match gcTime
	buster: '1', // increment on breaking schema changes
	dehydrateOptions: {
		shouldDehydrateQuery: (query) => {
			// Only persist successful queries with actual data (not empty/null arrays)
			if (query.state.status !== 'success') return false
			const data = query.state.data
			if (!Array.isArray(data) || data.length === 0) return false
			// Don't persist arrays containing null/undefined
			if (data.some((item) => item == null)) return false
			// Don't persist demo queries
			const key = query.queryKey?.[0]
			if (key === 'todos-cached' || key === 'demo-todos') return false
			return true
		}
	}
}

// Restore cache from IDB - await this before prefetching
export const cacheReady = persistQueryClientRestore(persistOptions)

// Subscribe to changes after restore completes
cacheReady.then(() => {
	persistQueryClientSubscribe(persistOptions)
})
