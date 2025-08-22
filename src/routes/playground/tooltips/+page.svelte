<script>
	import ToolTip from '$lib/components/tool-tip.svelte'
	import { tooltip } from '$lib/components/tooltip-attachment.js'
</script>

<h1>Tooltips</h1>

<section>
	<div>
		<div>
			<h3>Basic Tooltips</h3>
			<p>Hover or focus to reveal additional information</p>
			<div>
				<button id="notifications-btn" type="button" aria-label="Notifications">🔔</button>
				<ToolTip for="notifications-btn" content="Notifications" />

				<button id="settings-btn" type="button" aria-label="Settings">⚙️</button>
				<ToolTip for="settings-btn" content="Settings" />

				<button id="save-btn" type="button">Save</button>
				<ToolTip for="save-btn" content="Save your changes to local storage" />

				<button id="export-btn" type="button">Export</button>
				<ToolTip for="export-btn" content="Download playlist as JSON file" />
			</div>
		</div>

		<div>
			<h3>Positioning</h3>
			<p>Tooltips positioned around their targets</p>
			<div class="demo-positions">
				<button id="top-btn" type="button">Top</button>
				<ToolTip
					for="top-btn"
					content="Tooltip positioned above"
					position="top"
				/>

				<button id="bottom-btn" type="button">Bottom</button>
				<ToolTip
					for="bottom-btn"
					content="Tooltip positioned below"
					position="bottom"
				/>

				<button id="left-btn" type="button">Left</button>
				<ToolTip
					for="left-btn"
					content="Tooltip positioned to the left"
					position="left"
				/>

				<button id="right-btn" type="button">Right</button>
				<ToolTip
					for="right-btn"
					content="Tooltip positioned to the right"
					position="right"
				/>
			</div>
		</div>

		<div>
			<h3>Accessibility Features</h3>
			<p>Screen reader enhancements and keyboard support</p>
			<div>
				<button id="a11y-btn" type="button">Focus me</button>
				<ToolTip
					for="a11y-btn"
					content="Screen readers will hear this with proper separation"
				/>

				<p>
					<small
						>Try focusing the button above with a keyboard and notice the enhanced experience</small
					>
				</p>
			</div>
		</div>

		<div>
			<h3>Attachment API (Alternative Approach)</h3>
			<p>Same functionality using Svelte 5 attachments instead of component instances</p>
			<div>
				<button {@attach tooltip({content: "Notifications via attachment"})}>
					Notifications
				</button>

				<button {@attach tooltip({content: "Save your changes to local storage"})}>
					Save
				</button>

				<button {@attach tooltip({content: "Export data as JSON file"})}>
					Export
				</button>
			</div>

			<div>
				<button {@attach tooltip({content: "Positioned above", position: "top"})}>
					Top Attachment
				</button>

				<button {@attach tooltip({content: "Positioned below", position: "bottom"})}>
					Bottom Attachment
				</button>

				<button {@attach tooltip({content: "Positioned left", position: "left"})}>
					Left Attachment
				</button>

				<button {@attach tooltip({content: "Positioned right", position: "right"})}>
					Right Attachment
				</button>
			</div>
		</div>
	</div>
</section>
