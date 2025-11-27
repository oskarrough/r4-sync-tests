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
</script>

<section>
	<h3>Sync Status</h3>
	<dl>
		<dt>Network</dt>
		<dd style="color: {isOnline ? 'green' : 'red'}">{isOnline ? '🟢 Online' : '🔴 Offline'}</dd>
		<dt>Executor mode</dt>
		<dd><code>{offlineExecutor.mode}</code></dd>
		<dt>Pending transactions</dt>
		<dd>{pendingTransactions.length}</dd>
	</dl>
	{#if pendingTransactions.length > 0}
		<details>
			<summary>View pending ({pendingTransactions.length})</summary>
			<ul>
				{#each pendingTransactions as t}
					{@const m = t.mutations?.[0]}
					<li>
						{m?.type || '?'} - {m?.modified?.title || m?.original?.title || '?'}
						{#if t.lastError}<br><small>⚠️ {t.lastError.message} (retry {t.retryCount})</small>{/if}
					</li>
				{/each}
			</ul>
		</details>
	{/if}
	<p><small>Test: DevTools → Network → Offline, add track, go back online</small></p>
</section>
