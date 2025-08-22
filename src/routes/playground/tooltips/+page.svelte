<script>
	import ToolTip from '$lib/components/tool-tip.svelte'
	import {tooltip} from '$lib/components/tooltip-attachment.js'
</script>

<h1>Tooltips</h1>

<p>Tooltips are by default shown on hover and focus.</p>
<p>Tooltips can be positioned top, right, bottom, or left.</p>
<p>Tooltips can be added in two ways:</p>

<section>
	<h3>Inline component</h3>
	<button id="save-btn" type="button">Save</button>
	<ToolTip targetId="save-btn" content="Save your changes to local storage" />

	<p>Tooltips support four positions: top, bottom, left, and right.</p>
	<button id="top-btn" type="button">Top</button>
	<button id="right-btn" type="button">Right</button>
	<button id="bottom-btn" type="button">Bottom</button>
	<button id="left-btn" type="button">Left</button>

	<ToolTip targetId="top-btn" content="Tooltip positioned above" position="top" />
	<ToolTip targetId="right-btn" content="Tooltip positioned to the right" position="right" />
	<ToolTip targetId="bottom-btn" content="Tooltip positioned below" position="bottom" />
	<ToolTip targetId="left-btn" content="Tooltip positioned to the left" position="left" />
</section>

<section>
	<h3>Using svelte attachments</h3>
	<button {@attach tooltip({content: 'via attachment', position: 'bottom'})}> Hover me </button>
	<button
		{@attach tooltip({
			content: 'I can contain <strong>HTML</strong> yea!',
			position: 'bottom'
		})}
	>
		HTML tooltips
	</button>
	<button {@attach tooltip({content: 'Positioned above', position: 'top'})}> Top </button>
	<button {@attach tooltip({content: 'Positioned below', position: 'bottom'})}> Bottom </button>
	<button {@attach tooltip({content: 'Positioned left', position: 'left'})}> Left </button>
	<button {@attach tooltip({content: 'Positioned right', position: 'right'})}> Right </button>
</section>
