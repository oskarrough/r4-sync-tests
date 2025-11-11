<script>
import {getLocale, setLocale, locales} from '$lib/paraglide/runtime'
import {appState} from '$lib/app-state.svelte'
	import * as m from '$lib/paraglide/messages'

let selectedLocale = $state(appState.language ?? getLocale())

console.info('[i18n] LanguageSwitcher mounted with locale', selectedLocale)

	// Update the selected locale when appState.language changes
$effect(() => {
	if (appState.language && appState.language !== selectedLocale) {
		selectedLocale = appState.language
	}
})

	async function handleChange(event) {
		const locale = event.currentTarget.value
		if (!locale || locale === selectedLocale) return

		console.log('[i18n] switching locale', {from: selectedLocale, to: locale})

		// Set the locale using Paraglide without reloading
		await setLocale(locale, {reload: false})

		// Update app state
		appState.language = locale
		selectedLocale = locale

		console.log('[i18n] locale switch completed')
	}
</script>

<label class="language-select">
	<span>{m.settings_language_label()}</span>
	<select bind:value={selectedLocale} on:change={handleChange} on:input={handleChange}>
		{#each locales as locale}
			<option value={locale}>
				{locale === 'en' ? m.settings_language_option_en() : 
				 locale === 'de' ? m.settings_language_option_de() : 
				 locale === 'fr' ? m.settings_language_option_fr() : 
				 locale}
			</option>
		{/each}
	</select>
</label>

<style>
	.language-select {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-weight: 500;
	}

	select {
		border-radius: var(--radius-2);
		border: 1px solid var(--gray-6);
		background: var(--gray-2);
		padding: 0.5rem;
		font: inherit;
	}
</style>
