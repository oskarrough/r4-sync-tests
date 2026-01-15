<script>
	import {
		IconAdd,
		IconChartScatter,
		IconClose,
		IconDelete,
		IconEject,
		IconFavorite,
		IconFilterAlt,
		IconFullscreen,
		IconFunnelAscending,
		IconFunnelDescending,
		IconGrid,
		IconHistory,
		IconInfinite,
		IconMap,
		IconNextFill,
		IconOptionsHorizontal,
		IconPlayFill,
		IconPreviousFill,
		IconRadio,
		IconSearch,
		IconSettings,
		IconShuffle,
		IconSidebarFillRight,
		IconSignal,
		IconSort,
		IconTag,
		IconUnorderedList,
		IconUser,
		IconWifiOff,
		IconWifi
	} from 'obra-icons-svelte'

	/** @type {{icon: string, title?: string, className?: string, size?: string | number, children?: any, [key: string]: any}} */
	const {children, icon = '', title, className = '', size, ...rest} = $props()

	const icons = {
		add: IconAdd,
		'chart-scatter': IconChartScatter,
		close: IconClose,
		delete: IconDelete,
		eject: IconEject,
		favorite: IconFavorite,
		'filter-alt': IconFilterAlt,
		fullscreen: IconFullscreen,
		'funnel-ascending': IconFunnelAscending,
		'funnel-descending': IconFunnelDescending,
		grid: IconGrid,
		history: IconHistory,
		infinite: IconInfinite,
		map: IconMap,
		'next-fill': IconNextFill,
		'options-horizontal': IconOptionsHorizontal,
		'play-fill': IconPlayFill,
		'previous-fill': IconPreviousFill,
		radio: IconRadio,
		search: IconSearch,
		settings: IconSettings,
		shuffle: IconShuffle,
		'sidebar-fill-right': IconSidebarFillRight,
		signal: IconSignal,
		sort: IconSort,
		tag: IconTag,
		'unordered-list': IconUnorderedList,
		user: IconUser,
		'wifi-off': IconWifiOff,
		wifi: IconWifi
	}

	const Icon = $derived(icons[icon] ?? null)
</script>

<i class={`icon ${className}`} class:icon {title}>
	{#if Icon}
		<Icon {size} {...rest} />
	{/if}
	{#if children}
		{@render children()}
	{/if}
</i>

<style>
	.icon {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		font-style: normal;
	}
</style>
