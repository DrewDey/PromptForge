#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  auditRecoveredSourceRunPublicationRegistry,
  loadCheckedDedicatedSourceRunRoutes,
} from './source-run-publication-registry.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXPECTED_SUPABASE_PROJECT_REF = 'iccjwlwkaqnxifuxljla'
const TIMEOUT_MS = 15_000
const MAX_ROWS = 10_000

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

function fail(message) {
  throw new Error(`Source-run live publication registry check failed: ${message}`)
}

function exactResponseCount(response, rows) {
  const contentRange = response.headers.get('content-range')
  if (!contentRange) fail('Supabase omitted Content-Range, so query completeness is ambiguous.')
  if (contentRange === '*/0') return 0
  const match = contentRange.match(/^(\d+)-(\d+)\/(\d+)$/)
  if (!match) fail(`Supabase returned ambiguous Content-Range ${contentRange}.`)
  const start = Number(match[1])
  const end = Number(match[2])
  const total = Number(match[3])
  if (start !== 0 || end - start + 1 !== rows.length || total !== rows.length) {
    fail(`Supabase returned ${rows.length} of ${total} approved source-run projects.`)
  }
  return total
}

async function main() {
  if (process.env.VERCEL !== '1') {
    console.log('Skipped live source-run publication registry check outside Vercel.')
    return
  }

  loadEnvFile(path.join(root, '.env.local'))
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) fail('missing public Supabase build environment.')

  let parsedUrl
  try {
    parsedUrl = new URL(supabaseUrl)
  } catch {
    fail('NEXT_PUBLIC_SUPABASE_URL is not a valid URL.')
  }
  const projectRef = parsedUrl.hostname.endsWith('.supabase.co')
    ? parsedUrl.hostname.split('.')[0]
    : null
  if (projectRef !== EXPECTED_SUPABASE_PROJECT_REF) {
    fail(`unexpected Supabase project ${projectRef ?? 'unknown'}.`)
  }

  const recoveredAudit = auditRecoveredSourceRunPublicationRegistry()
  if (recoveredAudit.failures.length > 0) {
    fail(`static recovered registry is not trustworthy: ${recoveredAudit.failures.join('; ')}`)
  }
  const routeAudit = loadCheckedDedicatedSourceRunRoutes()
  if (routeAudit.failures.length > 0) {
    fail(`dedicated route registry is ambiguous: ${routeAudit.failures.join('; ')}`)
  }

  const query = new URL('/rest/v1/prompts', supabaseUrl)
  query.searchParams.set('select', 'id,title,tags,status')
  query.searchParams.set('status', 'eq.approved')
  query.searchParams.set('tags', 'cs.{source-run}')
  query.searchParams.set('order', 'id.asc')
  query.searchParams.set('limit', String(MAX_ROWS))

  let response
  try {
    response = await fetch(query, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        prefer: 'count=exact',
        range: `0-${MAX_ROWS - 1}`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    fail(`Supabase request did not complete: ${error.message}`)
  }
  if (!response.ok) fail(`Supabase returned HTTP ${response.status}.`)

  let rows
  try {
    rows = await response.json()
  } catch {
    fail('Supabase response was not valid JSON.')
  }
  if (!Array.isArray(rows)) fail('Supabase response was not an array.')
  const total = exactResponseCount(response, rows)
  if (total === 0) fail('Supabase returned no approved source-run-tagged projects.')

  const seenIds = new Set()
  for (const row of rows) {
    if (
      !row ||
      typeof row.id !== 'string' ||
      row.status !== 'approved' ||
      !Array.isArray(row.tags) ||
      !row.tags.includes('source-run')
    ) {
      fail('Supabase returned a row outside the exact approved source-run query contract.')
    }
    if (seenIds.has(row.id)) fail(`Supabase returned duplicate project ${row.id}.`)
    seenIds.add(row.id)

    const href = routeAudit.routes.get(row.id)
    if (!href || href.startsWith('/prompt/')) {
      fail(
        `approved source-run project ${row.id} (${row.title ?? 'untitled'}) lacks a checked dedicated route/registry entry.`,
      )
    }
  }

  console.log(
    `Verified ${total} approved source-run-tagged public projects against ${routeAudit.routes.size} checked dedicated routes before Vercel build.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
