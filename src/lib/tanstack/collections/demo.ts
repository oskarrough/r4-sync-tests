/**
 * Demo collection for the interactive TanStack guide.
 */
import {createCollection} from '@tanstack/svelte-db'
import {localOnlyCollectionOptions} from '@tanstack/db'
import type {DemoTodo} from '../../../routes/playground/tanstack/demo/demo-state.svelte'

export type {DemoTodo}

export const demoCollection = createCollection<DemoTodo, number>(
	localOnlyCollectionOptions({
		id: 'demo-todos',
		getKey: (item) => item.id
	})
)
