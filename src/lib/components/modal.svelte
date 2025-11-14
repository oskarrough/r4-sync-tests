<script>
	import Icon from '$lib/components/icon.svelte'
	import * as m from '$lib/paraglide/messages'

	let {showModal = $bindable(), header, children} = $props()

	let dialog = $state() // HTMLDialogElement

	$effect(() => {
		if (showModal) {
			dialog.showModal()
		} else {
			dialog.close()
		}
	})
</script>

<dialog
	bind:this={dialog}
	onclose={() => (showModal = false)}
	onclick={(e) => {
		if (e.target === dialog) dialog.close()
	}}
>
	<div>
		<header>
			{@render header?.()}
			<!-- svelte-ignore a11y_autofocus -->
			<button autofocus onclick={() => dialog.close()} title={m.modal_close_label()} aria-label={m.modal_close_label()}>
				<Icon icon="close" size={20} />
			</button>
		</header>
		{@render children?.()}
	</div>
</dialog>

<style>
	dialog {
		border: none;
		width: 100%;
		background: none;
		padding: calc(0.2px + 13vh) 12px 13vh;
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.4);
	}
	dialog > div {
		max-width: 640px;
		margin: auto;
		flex: 1;
		background: var(--gray-3);
		box-shadow:
			lch(0 0 0 / 0.15) 0px 4px 40px,
			lch(0 0 0 / 0.188) 0px 3px 20px,
			lch(0 0 0 / 0.188) 0px 3px 12px,
			lch(0 0 0 / 0.188) 0px 2px 8px,
			lch(0 0 0 / 0.188) 0px 1px 1px;
		border: 1px solid var(--gray-12);
		border-radius: var(--border-radius);
		padding: 1em;
	}
	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}
	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 1rem;
	}
	header :global(h2) {
		margin: 0;
	}
</style>
