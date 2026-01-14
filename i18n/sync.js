#!/usr/bin/env node
/**
 * Syncs translation files with en.json as source of truth.
 * - Adds missing keys to other languages (using English as placeholder)
 * - Removes orphaned keys not in English
 * - Sorts keys alphabetically
 */
import {readdirSync, readFileSync, writeFileSync} from 'fs'
import {join, dirname} from 'path'
import {fileURLToPath} from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const messagesDir = join(__dirname, 'messages')

const enPath = join(messagesDir, 'en.json')
const en = JSON.parse(readFileSync(enPath, 'utf8'))
const enKeys = new Set(Object.keys(en))

// Sort en.json too
const enSorted = Object.fromEntries(Object.entries(en).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(enPath, JSON.stringify(enSorted, null, '\t') + '\n')

const files = readdirSync(messagesDir).filter((f) => f.endsWith('.json') && f !== 'en.json')

let totalAdded = 0
let totalRemoved = 0

for (const file of files) {
	const path = join(messagesDir, file)
	const lang = JSON.parse(readFileSync(path, 'utf8'))
	const langKeys = new Set(Object.keys(lang))

	const missing = [...enKeys].filter((key) => !langKeys.has(key))
	const orphaned = [...langKeys].filter((key) => !enKeys.has(key))

	if (missing.length === 0 && orphaned.length === 0) continue

	// Add missing keys
	for (const key of missing) {
		lang[key] = en[key]
	}

	// Remove orphaned keys
	for (const key of orphaned) {
		delete lang[key]
	}

	// Sort keys alphabetically
	const sorted = Object.fromEntries(Object.entries(lang).sort(([a], [b]) => a.localeCompare(b)))

	writeFileSync(path, JSON.stringify(sorted, null, '\t') + '\n')

	const changes = []
	if (missing.length) changes.push(`+${missing.length}`)
	if (orphaned.length) changes.push(`-${orphaned.length}`)
	console.log(`${file}: ${changes.join(', ')}`)

	totalAdded += missing.length
	totalRemoved += orphaned.length
}

if (totalAdded === 0 && totalRemoved === 0) {
	console.log('All languages in sync')
} else {
	const summary = []
	if (totalAdded) summary.push(`${totalAdded} added`)
	if (totalRemoved) summary.push(`${totalRemoved} removed`)
	console.log(`\n${summary.join(', ')}`)
}
