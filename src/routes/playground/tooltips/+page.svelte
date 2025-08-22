<script>
	import ToolTip from '$lib/components/tool-tip.svelte'
</script>

<div class="styleguide">
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
				<h3>Positioning & Enhanced Features</h3>
				<p>Tooltips with triangle pointers, motion preferences, and better theming</p>
				<div class="demo-positions">
					<button id="top-btn" type="button">Top</button>
					<ToolTip
						for="top-btn"
						type="description"
						content="Enhanced tooltip on top with triangle pointer"
						position="top"
					/>

					<button id="bottom-btn" type="button">Bottom</button>
					<ToolTip
						for="bottom-btn"
						type="description"
						content="Enhanced tooltip on bottom with triangle pointer"
						position="bottom"
					/>

					<button id="left-btn" type="button">Left</button>
					<ToolTip
						for="left-btn"
						type="description"
						content="Enhanced tooltip on left with triangle pointer"
						position="left"
					/>

					<button id="right-btn" type="button">Right</button>
					<ToolTip
						for="right-btn"
						type="description"
						content="Enhanced tooltip on right with triangle pointer"
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
</div>

<style>
	.styleguide {
		margin: 0 0.5rem;
	}


	.tooltip-demos {
		display: grid;
		gap: 2rem;
	}

	.demo-group {
		padding: 1rem;
		border: 1px solid var(--gray-4);
		border-radius: var(--border-radius);
		background: var(--gray-2);
	}

	.demo-group h3 {
		margin: 0 0 0.5rem 0;
		font-size: var(--font-4);
	}

	.demo-group p {
		margin: 0 0 1rem 0;
		color: var(--gray-11);
		font-size: var(--font-2);
	}

	.demo-buttons {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.demo-positions {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 2rem;
		padding: 2rem;
		justify-items: center;
		align-items: center;
	}

	.demo-buttons button,
	.demo-positions button {
		position: relative;
		padding: 0.5rem 1rem;
		font-size: var(--font-3);
		cursor: pointer;
	}
</style>
