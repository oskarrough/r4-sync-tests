import {persistQueryClient, type PersistedClient} from '@tanstack/query-persist-client-core'
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

// Persist query cache to IDB - restores on import, subscribes to changes
export const unsubscribePersist = persistQueryClient({
	queryClient,
	persister: idbPersister,
	maxAge: 1000 * 60 * 60 * 24, // 24 hours
	buster: '' // increment on breaking schema changes
})
