/**
 * Demo collection for the interactive TanStack guide.
 * Uses dummyjson.com/todos as remote - no auth needed.
 */
import {createCollection} from '@tanstack/svelte-db'
import {localOnlyCollectionOptions} from '@tanstack/db'
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

import {demoStats} from '../../../routes/playground/tanstack/demo/demo-stats.svelte'

async function fetchTodos(limit = 10, skip = 0, delay = 300): Promise<DemoTodo[]> {
	demoStats.networkRequests++
	if (delay > 0) await new Promise((r) => setTimeout(r, delay))
	const res = await fetch(`https://dummyjson.com/todos?limit=${limit}&skip=${skip}`)
	const data: DummyJsonResponse = await res.json()
	return data.todos
}

async function addTodo(todo: string, delay = 200): Promise<DemoTodo> {
	demoStats.networkRequests++
	if (delay > 0) await new Promise((r) => setTimeout(r, delay))
	const res = await fetch('https://dummyjson.com/todos/add', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({todo, completed: false, userId: 1})
	})
	return res.json()
}

// In-memory collection for the demo - fresh on every page load
export const demoCollection = createCollection<DemoTodo, number>(
	localOnlyCollectionOptions({
		id: 'demo-todos',
		getKey: (item) => item.id
	})
)

export const demoAPI = {
	fetchTodos,
	addTodo,

	/** Fetch via queryClient.fetchQuery - updates cache, returns data */
	async fetchQuery() {
		const cached = queryClient.getQueryData(['todos-cached'])
		const query = queryClient.getQueryCache().find({queryKey: ['todos-cached']})
		const isStale = query ? query.isStale() : true
		const willHitCache = cached && !isStale

		const result = await queryClient.fetchQuery<DemoTodo[]>({
			queryKey: ['todos-cached'],
			queryFn: () => fetchTodos(3, 0),
			staleTime: 60 * 1000 // 1 minute - won't refetch if data is fresh
		})

		if (willHitCache) demoStats.cacheHits++
		return result
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
			.filter((q) => q.queryKey?.[0] === 'demo-todos')
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
		queryClient.removeQueries({queryKey: ['todos-cached']})
	},

	/** Clear collection */
	clearCollection() {
		const ids = [...demoCollection.state.keys()]
		for (const id of ids) {
			demoCollection.delete(id)
		}
	},

	/** Write to collection */
	writeToCollection(todos: DemoTodo[]) {
		for (const todo of todos) {
			// Only insert if not already present
			if (!demoCollection.state.has(todo.id)) {
				demoCollection.insert(todo)
			}
		}
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
