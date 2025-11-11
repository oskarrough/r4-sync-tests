<script>
	import ToolTip from '$lib/components/tool-tip.svelte'
	import {tooltip} from '$lib/components/tooltip-attachment.js'
	import * as m from '$lib/paraglide/messages'
</script>

<h1>{m.playground_tooltips_title()}</h1>

<p>{m.playground_tooltips_intro()}</p>
<p>{m.playground_tooltips_positions()}</p>
<p>{m.playground_tooltips_methods()}</p>

<section>
	<h3>{m.playground_tooltips_inline()}</h3>
	<button id="save-btn" type="button">{m.playground_tooltips_save()}</button>
	<ToolTip targetId="save-btn" content={m.playground_tooltips_save_hint()} />

	<p>{m.playground_tooltips_positions_desc()}</p>
	<button id="top-btn" type="button">{m.playground_tooltips_top()}</button>
	<button id="right-btn" type="button">{m.playground_tooltips_right()}</button>
	<button id="bottom-btn" type="button">{m.playground_tooltips_bottom()}</button>
	<button id="left-btn" type="button">{m.playground_tooltips_left()}</button>

	<ToolTip targetId="top-btn" content={m.playground_tooltips_positioned_above()} position="top" />
	<ToolTip targetId="right-btn" content={m.playground_tooltips_positioned_right()} position="right" />
	<ToolTip targetId="bottom-btn" content={m.playground_tooltips_positioned_below()} position="bottom" />
	<ToolTip targetId="left-btn" content={m.playground_tooltips_positioned_left()} position="left" />
</section>

<section>
	<h3>{m.playground_tooltips_attachments()}</h3>
	<button {@attach tooltip({content: m.playground_tooltips_via_attachment(), position: 'bottom'})}>
		{m.playground_tooltips_hover()}
	</button>
	<button
		{@attach tooltip({
			content: m.playground_tooltips_html_content(),
			position: 'bottom'
		})}
	>
		{m.playground_tooltips_html()}
	</button>
	<button {@attach tooltip({content: m.playground_tooltips_positioned_above(), position: 'top'})}>
		{m.playground_tooltips_top()}
	</button>
	<button {@attach tooltip({content: m.playground_tooltips_positioned_below(), position: 'bottom'})}>
		{m.playground_tooltips_bottom()}
	</button>
	<button {@attach tooltip({content: m.playground_tooltips_positioned_left(), position: 'left'})}>
		{m.playground_tooltips_left()}
	</button>
	<button {@attach tooltip({content: m.playground_tooltips_positioned_right(), position: 'right'})}>
		{m.playground_tooltips_right()}
	</button>
</section>
