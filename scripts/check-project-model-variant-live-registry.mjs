#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_MODEL_VARIANT_MANIFESTS } from './project-model-variant-cohort-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXPECTED_SUPABASE_PROJECT_REF = 'iccjwlwkaqnxifuxljla'
const TIMEOUT_MS = 30_000
const FETCH_ATTEMPTS = 2

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

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'))
}

function fail(message) {
  throw new Error(`Model-variant live registry check failed: ${message}`)
}

async function fetchRegistry(query, headers) {
  let lastError
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(query, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      lastError = error
      if (attempt < FETCH_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 750))
      }
    }
  }
  throw lastError
}

async function main() {
  if (process.env.VERCEL !== '1') {
    console.log('Skipped live model-variant registry check outside Vercel.')
    return
  }

  loadEnvFile(path.join(root, '.env.local'))
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) fail('missing public Supabase build environment.')

  const parsedUrl = new URL(supabaseUrl)
  const projectRef = parsedUrl.hostname.endsWith('.supabase.co')
    ? parsedUrl.hostname.split('.')[0]
    : null
  if (projectRef !== EXPECTED_SUPABASE_PROJECT_REF) {
    fail(`unexpected Supabase project ${projectRef ?? 'unknown'}.`)
  }

  const manifests = ALL_MODEL_VARIANT_MANIFESTS.map((fileName) =>
    readJson(`seed-runs/model-variants/${fileName}`),
  )
  const expectedVariants = manifests.flatMap((manifest) =>
    manifest.variants.map((variant) => ({
      project_id: manifest.canonicalProjectId,
      source_run_id: variant.sourceRunId,
      source_package_sha256: variant.packageSha256,
      opening_prompt_sha256: manifest.contract.openingPromptSha256,
      comparison_contract_sha256: manifest.contract.sha256,
      expected_status: variant.runRole === 'historical-baseline' ? 'historical' : 'published',
    })),
  )
  const projectIds = [...new Set(manifests.map((manifest) => manifest.canonicalProjectId))]
  const query = new URL('/rest/v1/project_model_variants', supabaseUrl)
  query.searchParams.set(
    'select',
    'project_id,source_run_id,source_package_sha256,opening_prompt_sha256,comparison_contract_sha256,status,quality_status,is_current,is_default',
  )
  query.searchParams.set('project_id', `in.(${projectIds.join(',')})`)
  query.searchParams.set('status', 'in.(published,historical)')

  const response = await fetchRegistry(query, {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
  })
  if (!response.ok) fail(`Supabase returned HTTP ${response.status}.`)
  const rows = await response.json()
  if (!Array.isArray(rows)) fail('Supabase response was not an array.')

  const rowsBySourceRunId = new Map(rows.map((row) => [row.source_run_id, row]))
  for (const expected of expectedVariants) {
    const actual = rowsBySourceRunId.get(expected.source_run_id)
    if (!actual) fail(`missing checked source run ${expected.source_run_id}.`)
    for (const field of [
      'project_id',
      'source_package_sha256',
      'opening_prompt_sha256',
      'comparison_contract_sha256',
    ]) {
      if (actual[field] !== expected[field]) {
        fail(`${expected.source_run_id} has mismatched ${field}.`)
      }
    }
    if (actual.status !== expected.expected_status) {
      fail(`${expected.source_run_id} has mismatched public status.`)
    }
  }

  for (const projectId of projectIds) {
    const defaults = rows.filter((row) => row.project_id === projectId && row.is_default)
    if (
      defaults.length !== 1 ||
      defaults[0].status !== 'published' ||
      defaults[0].quality_status !== 'verified' ||
      defaults[0].is_current !== true
    ) {
      fail(`${projectId} does not expose exactly one current verified default.`)
    }
  }

  console.log(
    `Verified ${expectedVariants.length} checked model-variant rows in Supabase before Vercel build.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
