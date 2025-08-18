import {defineConfig} from 'vite'
import {resolve} from 'path'

export default defineConfig({
	resolve: {
		alias: {
			$lib: resolve('./src/lib')
		}
	},
	build: {
		target: 'node18',
		outDir: 'bin',
		ssr: true,
		rollupOptions: {
			input: 'cli.ts',
			output: {
				entryFileNames: 'r5.js',
				format: 'es'
			},
			external: ['yargs', '@electric-sql/pglite', '@radio4000/sdk']
		},
		minify: false
	},
	define: {
		global: 'globalThis'
	},
	optimizeDeps: {
		exclude: ['@electric-sql/pglite']
	}
})
