#!/usr/bin/env node

// Deprecated compatibility shim.
//
// Source-run intake has one canonical importer:
//   scripts/import-pathforge-source-run.mjs
//
// Keep this file only so older local notes or shell history fail safely instead
// of recreating a second direct submission path. The canonical importer requires
// package-level provider/model metadata and still stops at queued source-run
// intake. It does not create public prompt/upvote pages.

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

function hasArg(name) {
  return process.argv.includes(name)
}

function valueAfter(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return ''
  return process.argv[index + 1] ?? ''
}

function printUsage() {
  console.error([
    'scripts/seed-submission.mjs is deprecated.',
    '',
    'Use the canonical source-run importer instead:',
    '  node scripts/import-pathforge-source-run.mjs --package seed-runs/example.json --username JordanLee --dry-run',
    '',
    'Required package fields include title, source_url, provider, model/model_used, and agent_notes.',
    'Old --title/--link/--notes usage is refused because it bypasses provider/model metadata.',
  ].join('\n'))
}

if (hasArg('--title') || hasArg('--link') || hasArg('--notes') || hasArg('--profile')) {
  printUsage()
  process.exit(1)
}

const packagePath = valueAfter('--package')
if (!packagePath) {
  printUsage()
  process.exit(1)
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const importerPath = resolve(scriptDir, 'import-pathforge-source-run.mjs')
const forwardedArgs = process.argv.slice(2)

const result = spawnSync(process.execPath, [importerPath, ...forwardedArgs], {
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
