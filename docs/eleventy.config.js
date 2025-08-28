import markdownIt from 'markdown-it'
import markdownItReplaceLink from 'markdown-it-replace-link'

export default function (eleventyConfig) {
	let options = {
		// processHTML: true,
		replaceLink: function (link) {
			if (link.endsWith('.md')) {
				return link.replace('.md', '')
			}
			return link
		}
	}

	eleventyConfig.setLibrary('md', markdownIt(options))
	eleventyConfig.amendLibrary('md', (mdLib) => mdLib.use(markdownItReplaceLink))

	// Set default layout for all markdown files
	eleventyConfig.addGlobalData('layout', 'base.njk')
}
