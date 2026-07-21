#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8')

const shared = read('src/lib/data/shared.ts')
const server = read('src/lib/supabase/server.ts')
const dataSources = [
  read('src/lib/data.ts'),
  read('src/lib/data/public-profiles.ts'),
]
const packageJson = read('package.json')

assert.match(
  shared,
  /read: \(signal: AbortSignal\) => Promise<T>/,
  'fallback reads must receive an AbortSignal',
)
assert.match(shared, /const controller = new AbortController\(\)/)
assert.match(
  shared,
  /setTimeout\(\(\) => \{\s*resolve\(fallback\)\s*controller\.abort\(\)/,
  'the fallback deadline must return fallback data and abort the live read in the same tick',
)
assert.match(
  shared,
  /finally \{\s*if \(timeout\) clearTimeout\(timeout\)/,
  'fast reads must clear the fallback timer',
)

assert.match(server, /export async function createPublicReadClient\(\)/)
assert.match(
  server,
  /every query issued through this scoped client is guarded with retry\(false\)/,
  'the public-read client must document the installed SDK retry boundary',
)
assert.match(
  server,
  /export async function createClient\(\) \{\s*return createCookieBackedClient\(\)\s*\}/,
  'the auth/write client must retain its existing default retry behavior',
)

let fallbackReadCount = 0
for (const source of dataSources) {
  const reads = source.match(/readWithFallback\(/g) ?? []
  const signalCallbacks = source.match(/async \(signal\) => \{/g) ?? []
  const publicClients = source.match(/createPublicReadClient\(\)/g) ?? []
  fallbackReadCount += reads.length

  assert.equal(
    signalCallbacks.length,
    reads.length,
    'every fallback read must accept the shared abort signal',
  )
  assert.equal(
    publicClients.length,
    reads.length,
    'every fallback read must use the no-retry public client',
  )
  assert.doesNotMatch(
    source,
    /readWithFallback\([\s\S]{0,200}?async \(\) =>/,
    'fallback reads must not discard the abort signal',
  )
}

const abortSignalCount = dataSources.reduce(
  (total, source) => total + (source.match(/\.abortSignal\(signal\)/g) ?? []).length,
  0,
)
const disabledRetryCount = dataSources.reduce(
  (total, source) => total + (source.match(/\.retry\(false\)/g) ?? []).length,
  0,
)
assert.ok(fallbackReadCount > 0, 'expected checked public fallback reads')
assert.ok(
  abortSignalCount >= fallbackReadCount,
  'every fallback read must abort at least one PostgREST query',
)
assert.equal(
  disabledRetryCount,
  abortSignalCount,
  'every abortable fallback query must explicitly disable PostgREST retries',
)
assert.match(
  packageJson,
  /"prebuild": "[^"]*npm run check:supabase-public-reads/,
  'production builds must enforce the public-read saturation guard',
)

console.log(
  `Supabase public-read saturation guard passed for ${fallbackReadCount} fallback reads and ${abortSignalCount} abortable no-retry PostgREST queries.`,
)
