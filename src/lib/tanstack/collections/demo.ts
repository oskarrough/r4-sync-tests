/**
 * Demo collection for the interactive TanStack guide.
 * Uses dummyjson.com/todos as remote - no auth needed.
 */
import {createCollection} from '@tanstack/svelte-db'
import {localStorageCollectionOptions} from '@tanstack/db'
import {queryClient} from './query-client'

export type DemoTodo = {
	id: number
	todo: string
	completed: boolean
	userId: number
}

type DummyJsonResponse = {
	todos: DemoTodo[]
	total: number
	skip: number
	limit: number
}

async function fetchTodos(limit = 10, skip = 0): Promise<DemoTodo[]> {
	const res = await fetch(`https://dummyjson.com/todos?limit=${limit}&skip=${skip}`)
	const data: DummyJsonResponse = await res.json()
	return data.todos
}

// localStorage collection for the demo - persists locally, we manually sync with remote
export const demoCollection = createCollection<DemoTodo, number>(
	localStorageCollectionOptions({
		storageKey: 'r5-demo-todos',
		getKey: (item) => item.id
	})
)

export const demoAPI = {
	fetchTodos,

	/** Fetch via queryClient.fetchQuery - updates cache, returns data */
	async fetchQuery() {
		return queryClient.fetchQuery<DemoTodo[]>({
			queryKey: ['demo-todos'],
			queryFn: () => fetchTodos(10, 0)
		})
	},

	/** Fetch via queryClient.prefetchQuery - updates cache, returns nothing */
	async prefetchQuery() {
		return queryClient.prefetchQuery({
			queryKey: ['demo-todos'],
			queryFn: () => fetchTodos(10, 0)
		})
	},

	/** Fetch second batch (different query key) */
	async fetchSecondBatch() {
		return queryClient.fetchQuery<DemoTodo[]>({
			queryKey: ['demo-todos', 'batch2'],
			queryFn: () => fetchTodos(10, 10)
		})
	},

	/** Get current query cache state */
	getQueryCache() {
		const queries = queryClient
			.getQueryCache()
			.getAll()
			.filter((q) => q.queryKey[0] === 'demo-todos')
		return queries.map((q) => ({
			queryKey: q.queryKey,
			data: q.state.data as DemoTodo[] | undefined,
			dataUpdatedAt: q.state.dataUpdatedAt,
			status: q.state.status,
			isStale: q.isStale()
		}))
	},

	/** Get current collection state */
	getCollectionState() {
		return {
			size: demoCollection.state.size,
			items: [...demoCollection.state.values()]
		}
	},

	/** Clear query cache for demo */
	clearCache() {
		queryClient.removeQueries({queryKey: ['demo-todos']})
	},

	/** Clear collection */
	clearCollection() {
		const ids = [...demoCollection.state.keys()]
		for (const id of ids) {
			demoCollection.delete(id)
		}
	},

	/** Write directly to collection (bypasses mutation hooks) */
	writeToCollection(todos: DemoTodo[]) {
		demoCollection.utils.writeBatch(() => {
			for (const todo of todos) {
				demoCollection.utils.writeUpsert(todo)
			}
		})
	},

	/** Insert via collection mutation */
	insertTodo(todo: Omit<DemoTodo, 'id'>) {
		const id = Date.now()
		demoCollection.insert({...todo, id})
		return id
	},

	/** Update via collection mutation */
	updateTodo(id: number, changes: Partial<DemoTodo>) {
		demoCollection.update(id, (draft) => {
			Object.assign(draft, changes)
		})
	},

	/** Delete via collection mutation */
	deleteTodo(id: number) {
		demoCollection.delete(id)
	}
}
