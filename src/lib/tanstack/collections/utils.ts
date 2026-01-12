import {logger} from '$lib/logger'

export const log = logger.ns('tanstack').seal()
export const txLog = logger.ns('tanstack.tx').seal()
export const offlineLog = logger.ns('tanstack.offline').seal()

// Ideally SDK errors would have consistent shape. They don't.
export function getErrorMessage(err: unknown): string {
	if (err instanceof Error) return err.message
	if (typeof err === 'string') return err
	if (err && typeof err === 'object' && 'message' in err) return String(err.message)
	return 'Unknown error'
}
