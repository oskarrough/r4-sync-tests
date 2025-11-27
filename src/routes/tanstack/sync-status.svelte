<script lang="ts">
	import {offlineExecutor} from './collections'

	let isOnline = $state(navigator.onLine)
	let pendingTransactions = $state<unknown[]>([])

	$effect(() => {
		const onOnline = () => (isOnline = true)
		const onOffline = () => (isOnline = false)
		window.addEventListener('online', onOnline)
		window.addEventListener('offline', onOffline)
		return () => {
			window.removeEventListener('online', onOnline)
			window.removeEventListener('offline', onOffline)
		}
	})

	$effect(() => {
		const interval = setInterval(async () => {
			pendingTransactions = await offlineExecutor.peekOutbox()
		}, 1000)
		return () => clearInterval(interval)
	})

	const hasPending = $derived(pendingTransactions.length > 0)
	const showStatus = $derived(!isOnline || hasPending)
</script>

{#if showStatus}
	<dl class="meta">
		<dt>Sync</dt>
		<dd>
			{#if !isOnline}Offline{/if}
			{#if hasPending}
				<details>
					<summary>{pendingTransactions.length} pending</summary>
					<ul>
						{#each pendingTransactions as t, i (i)}
							{@const m = t.mutations?.[0]}
							<li>
								{m?.type || '?'} – {m?.modified?.title || m?.original?.title || '?'}
								{#if t.lastError}<br /><small>⚠️ {t.lastError.message} (retry {t.retryCount})</small>{/if}
							</li>
						{/each}
					</ul>
				</details>
			{/if}
		</dd>
	</dl>
{/if}
