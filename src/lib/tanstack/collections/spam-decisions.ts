import {createCollection} from '@tanstack/svelte-db'
import {localStorageCollectionOptions} from '@tanstack/db'

// Spam decisions collection - local-only admin state for spam-warrior tool
export interface SpamDecision {
	channelId: string
	spam: boolean // true = mark for deletion, false = keep
}

export const spamDecisionsCollection = createCollection<SpamDecision, string>(
	localStorageCollectionOptions({
		id: 'spam-decisions',
		storageKey: 'r5-spam-decisions',
		getKey: (item) => item.channelId
	})
)
