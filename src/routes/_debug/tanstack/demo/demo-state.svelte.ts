/** Demo state: fake API with in-memory persistence + stats tracking */
import {createCollection} from '@tanstack/svelte-db'
import {localOnlyCollectionOptions} from '@tanstack/db'

export type DemoTodo = {
	id: number
	todo: string
	completed: boolean
	userId: number
}

export const demoCollection = createCollection<DemoTodo, number>(
	localOnlyCollectionOptions({
		id: 'demo-todos',
		getKey: (item) => item.id
	})
)

const initialTodos: DemoTodo[] = [
	{id: 1, todo: 'Buy groceries', completed: false, userId: 1},
	{id: 2, todo: 'Walk the dog', completed: false, userId: 1},
	{id: 3, todo: 'Read a book', completed: true, userId: 1}
]

let todos = $state<DemoTodo[]>([...initialTodos])

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const fakeAPI = {
	async fetch(delay = 300): Promise<DemoTodo[]> {
		demoState.networkRequests++
		await sleep(delay)
		return [...todos]
	},

	async add(todo: DemoTodo, delay = 200): Promise<DemoTodo> {
		demoState.networkRequests++
		await sleep(delay)
		todos = [todo, ...todos]
		return todo
	},

	reset() {
		todos = [...initialTodos]
	}
}

export const demoState = $state({
	networkRequests: 0,
	cacheHits: 0
})
