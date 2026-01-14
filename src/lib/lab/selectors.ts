/**
 * Composable utilities for functional pipelines.
 */

export * as queue from '$lib/player/queue'

type Fn<A, B> = (a: A) => B

/** Pipe a value through functions (left to right) */
export function pipe<A>(a: A): A
export function pipe<A, B>(a: A, ab: Fn<A, B>): B
export function pipe<A, B, C>(a: A, ab: Fn<A, B>, bc: Fn<B, C>): C
export function pipe<A, B, C, D>(a: A, ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>): D
export function pipe<A, B, C, D, E>(a: A, ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>, de: Fn<D, E>): E
export function pipe(a: unknown, ...fns: Array<Fn<unknown, unknown>>): unknown {
	return fns.reduce((acc, fn) => fn(acc), a)
}

/** Compose functions (right to left) */
export function compose<A, B>(ab: Fn<A, B>): Fn<A, B>
export function compose<A, B, C>(bc: Fn<B, C>, ab: Fn<A, B>): Fn<A, C>
export function compose<A, B, C, D>(cd: Fn<C, D>, bc: Fn<B, C>, ab: Fn<A, B>): Fn<A, D>
export function compose(...fns: Array<Fn<unknown, unknown>>): Fn<unknown, unknown> {
	return (a: unknown) => fns.reduceRight((acc, fn) => fn(acc), a)
}

/** Identity function */
export function identity<T>(x: T): T {
	return x
}

/** Constant function */
export function constant<T>(x: T): () => T {
	return () => x
}

/** Pick random element from array */
export function pickRandom<T>(arr: T[]): T | undefined {
	if (!arr.length) return undefined
	return arr[Math.floor(Math.random() * arr.length)]
}

/** Pick N random elements from array (no duplicates) */
export function pickRandomN<T>(n: number) {
	return (arr: T[]): T[] => {
		if (n >= arr.length) return [...arr]
		const copy = [...arr]
		const result: T[] = []
		for (let i = 0; i < n && copy.length > 0; i++) {
			const idx = Math.floor(Math.random() * copy.length)
			result.push(copy.splice(idx, 1)[0])
		}
		return result
	}
}

/** Tap: execute side effect, return value unchanged (for debugging pipelines) */
export function tap<T>(fn: (x: T) => void) {
	return (x: T): T => {
		fn(x)
		return x
	}
}

/** When: conditionally apply transform */
export function when<T>(predicate: (x: T) => boolean, transform: (x: T) => T) {
	return (x: T): T => (predicate(x) ? transform(x) : x)
}
