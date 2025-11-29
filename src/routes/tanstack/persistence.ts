import {
	persistQueryClientRestore,
	persistQueryClientSubscribe,
	type PersistedClient
} from '@tanstack/query-persist-client-core'
import {get, set, del} from 'idb-keyval'
import {queryClient} from './collections'

// Workaround for https://github.com/TanStack/db/issues/901
// syncMode: "on-demand" collections add non-serializable functions to query meta
// JSON round-trip with circular ref handling
function stripNonSerializable(client: PersistedClient): PersistedClient {
	const seen = new WeakSet()
	return JSON.parse(
		JSON.stringify(client, (_key, value) => {
			if (typeof value === 'function') return undefined
			if (value && typeof value === 'object') {
				if (seen.has(value)) return undefined
				seen.add(value)
			}
			return value
		})
	)
}

// IDB persister for query cache
const idbPersister = {
	persistClient: async (client: PersistedClient) => {
		await set('r5-query-cache', stripNonSerializable(client))
	},
	restoreClient: async () => {
		return await get<PersistedClient>('r5-query-cache')
	},
	removeClient: async () => {
		await del('r5-query-cache')
	}
}

const persistOptions = {
	queryClient,
	persister: idbPersister,
	maxAge: 24 * 60 * 60 * 1000, // 24h - match gcTime
	buster: '', // increment on breaking schema changes
	dehydrateOptions: {
		shouldDehydrateQuery: (query) => {
			return query.state.status === 'success'
		}
	}
}

// Restore cache from IDB - await this before prefetching
export const cacheReady = persistQueryClientRestore(persistOptions)

// Subscribe to changes after restore completes
cacheReady.then(() => {
	persistQueryClientSubscribe(persistOptions)
})
