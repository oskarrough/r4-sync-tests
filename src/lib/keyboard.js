import {createKeybindingsHandler} from 'tinykeys'
import * as api from '$lib/api.js'
import {toggleShuffle} from '$lib/api/player.js'
import {appState} from '$lib/app-state.svelte'

/** Maps keybinding to functions from api.js */
export const DEFAULT_KEY_BINDINGS = {
	f: 'togglePlayerExpanded',
	'$mod+k': 'openSearch',
	'/': 'openSearch',
	k: 'togglePlayPause',
	r: 'toggleQueuePanel',
	s: 'toggleShuffle'
}

export function initializeKeyboardShortcuts() {
	const keyBindings = appState.shortcuts || DEFAULT_KEY_BINDINGS
	const bindings = {}

	for (const [key, actionName] of Object.entries(keyBindings)) {
		const actionFn = actionName === 'toggleShuffle' ? toggleShuffle : api[actionName]
		if (actionFn) {
			bindings[key] = (event) => {
				if (
					event.target instanceof HTMLInputElement ||
					event.target instanceof HTMLTextAreaElement ||
					event.target instanceof HTMLSelectElement ||
					event.target.tagName === 'DATALIST'
				)
					return
				actionFn(event)
			}
		}
	}

	const handler = createKeybindingsHandler(bindings)
	window.addEventListener('keydown', handler)
	return () => window.removeEventListener('keydown', handler)
}
