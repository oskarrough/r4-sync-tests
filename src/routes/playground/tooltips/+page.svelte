<script>
	import ToolTip from '$lib/components/tool-tip.svelte'
</script>

<h1>Tooltips</h1>

<section>
	<div class="tooltip-demos">
		<div class="demo-group">
			<h3>Label Tooltips</h3>
			<p>For icon buttons where the tooltip provides the primary label</p>
			<div class="demo-buttons">
				<button id="notifications-btn" type="button">🔔</button>
				<ToolTip for="notifications-btn" type="label" content="Notifications" />

				<button id="settings-btn" type="button">⚙️</button>
				<ToolTip for="settings-btn" type="label" content="Settings" />
			</div>
		</div>

		<div class="demo-group">
			<h3>Description Tooltips</h3>
			<p>For buttons with visible labels that need additional clarification</p>
			<div class="demo-buttons">
				<button id="save-btn" type="button">Save</button>
				<ToolTip for="save-btn" type="description" content="Save your changes to local storage" />

				<button id="export-btn" type="button">Export</button>
				<ToolTip for="export-btn" type="description" content="Download playlist as JSON file" />
			</div>
		</div>

		<div class="demo-group">
			<h3>Toggletips</h3>
			<p>Click-to-reveal information bubbles</p>
			<div class="demo-buttons">
				<button id="help-1" type="button" aria-label="more info">ℹ️</button>
				<ToolTip
					for="help-1"
					type="toggletip"
					content="This explains how the feature works and why you might want to use it"
				/>

				<button id="help-2" type="button" aria-label="more info">❓</button>
				<ToolTip
					for="help-2"
					type="toggletip"
					content="Another helpful explanation that appears when clicked"
				/>
			</div>
		</div>

		<div class="demo-group">
			<h3>Positioning</h3>
			<p>Tooltips positioned around their targets</p>
			<div class="demo-positions">
				<button id="top-btn" type="button">Top</button>
				<ToolTip
					for="top-btn"
					type="description"
					content="Tooltip positioned above"
					position="top"
				/>

				<button id="bottom-btn" type="button">Bottom</button>
				<ToolTip
					for="bottom-btn"
					type="description"
					content="Tooltip positioned below"
					position="bottom"
				/>

				<button id="left-btn" type="button">Left</button>
				<ToolTip
					for="left-btn"
					type="description"
					content="Tooltip positioned to the left"
					position="left"
				/>

				<button id="right-btn" type="button">Right</button>
				<ToolTip
					for="right-btn"
					type="description"
					content="Tooltip positioned to the right"
					position="right"
				/>
			</div>
		</div>

		<div class="demo-group">
			<h3>Accessibility Features</h3>
			<p>Screen reader enhancements and reduced motion support</p>
			<div class="demo-buttons">
				<button id="a11y-btn" type="button">Focus me</button>
				<ToolTip
					for="a11y-btn"
					type="description"
					content="Screen readers will hear: 'Focus me; Has tooltip: Screen readers will hear this with proper separation'"
				/>

				<p>
					<small
						>Try focusing the button above with a keyboard and notice the enhanced experience</small
					>
				</p>
			</div>
		</div>
	</div>
</section>
