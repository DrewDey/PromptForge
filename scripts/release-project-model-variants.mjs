#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALL_MODEL_VARIANT_MANIFESTS,
  ALL_MODEL_VARIANT_MANIFEST_PATHS,
} from './project-model-variant-cohort-config.mjs'
import {
  preserveExistingReleaseDefault,
  resolveAppendReleaseLineage,
} from './project-model-variant-lineage.mjs'
import {
  artifactEvidenceMatches,
  attachSourceRunIdentityToArtifactEvidence,
} from './project-model-variant-release-evidence.mjs'
import {
  createSupabaseServerClient,
  resolveSupabaseServerKey,
} from '../src/lib/supabase/server-client.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXPECTED_SUPABASE_PROJECT_REF = 'iccjwlwkaqnxifuxljla'

const RELEASE_FIELDS = [
  'project_id',
  'source_run_id',
  'provider_key',
  'service_label',
  'model_release_key',
  'model_label',
  'model_settings',
  'source_url',
  'source_package_file',
  'source_package_sha256',
  'opening_prompt_sha256',
  'comparison_contract_version',
  'comparison_contract_sha256',
  'operator_kind',
  'operator_label',
  'automation_run_id',
  'run_role',
  'quality_status',
  'run_started_at',
  'run_finished_at',
  'prompt_count',
  'repair_prompt_count',
  'first_artifact_path',
  'final_artifact_path',
  'artifact_version_paths',
  'first_pass_metrics',
  'final_metrics',
  'status',
  'is_current',
  'is_default',
  'supersedes_variant_id',
]

const RELEASE_SELECT = ['id', 'created_at', ...RELEASE_FIELDS].join(', ')

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

function assertReleaseWorkspaceAndProject(args) {
  if (!args.apply && !args.emitPayload) return null

  const status = execFileSync(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all'],
    { cwd: root, encoding: 'utf8' },
  ).trim()
  if (status) {
    throw new Error(
      'Database release handoff requires a clean committed worktree so published evidence matches one exact commit.',
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')

  let projectRef
  try {
    const hostname = new URL(supabaseUrl).hostname
    projectRef = hostname.endsWith('.supabase.co') ? hostname.split('.')[0] : null
  } catch {
    projectRef = null
  }
  if (projectRef !== EXPECTED_SUPABASE_PROJECT_REF) {
    throw new Error(
      `Refusing model-variant release for unexpected Supabase project ${projectRef ?? 'unknown'}.`,
    )
  }

  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
}

function assertReleaseCandidateUnchanged(expectedHead) {
  if (!expectedHead) return
  const currentHead = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
  const status = execFileSync(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all'],
    { cwd: root, encoding: 'utf8' },
  ).trim()
  if (currentHead !== expectedHead || status) {
    throw new Error(
      'Release candidate changed during verification; commit the final evidence and rerun the database handoff.',
    )
  }
}

function parseArgs(argv) {
  const args = {
    apply: false,
    all: false,
    emitPayload: false,
    envFile: '',
    output: '',
    manifests: [],
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--apply') args.apply = true
    else if (arg === '--all') args.all = true
    else if (arg === '--emit-payload') args.emitPayload = true
    else if (arg === '--manifest') args.manifests.push(argv[++index] ?? '')
    else if (arg === '--env-file') args.envFile = argv[++index] ?? ''
    else if (arg === '--output') args.output = argv[++index] ?? ''
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (args.all && args.manifests.length > 0) {
    throw new Error('Use either --all or one or more --manifest values, not both.')
  }
  if (!args.all && args.manifests.length === 0) {
    throw new Error(
      'Choose --all or one or more --manifest files. Add --apply only after the release guard passes.',
    )
  }
  if (args.apply && args.emitPayload) {
    throw new Error('--emit-payload is a read-only alternative to --apply.')
  }
  if (args.output && !args.emitPayload) {
    throw new Error('--output is available only with --emit-payload.')
  }
  return args
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'))
}

function sha256File(relativePath) {
  return createHash('sha256')
    .update(readFileSync(path.join(root, relativePath)))
    .digest('hex')
}

function manifestPaths(args) {
  if (args.manifests.length > 0) {
    const selectedPaths = args.manifests.map((value) => {
      const fileName = value.endsWith('.json') ? value : `${value}.json`
      return fileName.startsWith('seed-runs/')
        ? fileName
        : `seed-runs/model-variants/${fileName}`
    })
    const allowedPaths = new Set(ALL_MODEL_VARIANT_MANIFEST_PATHS)
    for (const selectedPath of selectedPaths) {
      if (!allowedPaths.has(selectedPath)) {
        throw new Error(
          `Unregistered model-variant manifest: ${selectedPath}. Update the guarded cohort before releasing it.`,
        )
      }
    }
    if (new Set(selectedPaths).size !== selectedPaths.length) {
      throw new Error('Each --manifest value may be selected only once.')
    }
    return selectedPaths
  }

  return ALL_MODEL_VARIANT_MANIFESTS
    .map((fileName) => `seed-runs/model-variants/${fileName}`)
    .sort()
}

function modelReleaseKey(variant) {
  return variant.modelLabel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function modelSettingsRecord(variant) {
  const settings = variant.modelSettings
  if (variant.providerKey === 'openai') {
    const reasoning = settings.match(/(?:Effort|Intelligence):\s*([^;.]+)/i)?.[1]?.trim()
    const speed = settings.match(/Speed:\s*([^;.]+)/i)?.[1]?.trim()
    const surface = /ChatGPT Work/i.test(settings) ? 'ChatGPT Work' : null
    if (surface && reasoning) {
      return {
        surface,
        reasoning_effort: reasoning,
        ...(speed ? { speed } : {}),
      }
    }
  }
  if (variant.providerKey === 'anthropic') {
    const reasoning = settings.match(/Claude web;\s*([^;.]+?)\s+reasoning/i)?.[1]?.trim()
    if (reasoning) return { surface: 'Claude web', reasoning_effort: reasoning }
  }
  if (variant.providerKey === 'google') {
    const mode = settings.match(/Gemini web;\s*([^;.]+?)\s+mode/i)?.[1]?.trim()
    if (mode) return { surface: 'Gemini web', mode }
  }
  return { summary: settings }
}

function releaseRow(manifestPath, manifest, variant) {
  const packagePath = `seed-runs/${variant.packageFile}`
  const sourcePackage = readJson(packagePath)
  if (!sourcePackage.source_url) {
    throw new Error(`${packagePath}: missing source_url.`)
  }
  const artifactEvidence = variant.artifactVersionPaths.map((artifactPath) => {
    const artifactSha256 = sha256File(artifactPath)
    let matchingSteps = (sourcePackage.steps ?? []).filter((step) => (
      step.artifact_version_path === artifactPath ||
      step.generated_files?.includes(artifactPath)
    ))
    if (matchingSteps.length === 0) {
      matchingSteps = (sourcePackage.steps ?? []).filter((step) => {
        const stepPaths = new Set([
          step.artifact_version_path,
          ...(step.generated_files ?? []),
        ].filter(Boolean))
        return [...stepPaths].some((stepPath) => (
          existsSync(path.join(root, stepPath)) && sha256File(stepPath) === artifactSha256
        ))
      })
    }
    if (matchingSteps.length !== 1) {
      throw new Error(
        `${packagePath}: ${artifactPath} must belong to exactly one response; found ${matchingSteps.length}.`,
      )
    }
    const step = matchingSteps[0]
    if (
      step.artifact_version_path === artifactPath &&
      step.artifact_sha256 &&
      step.artifact_sha256.toLowerCase() !== artifactSha256
    ) {
      throw new Error(`${packagePath}: stored SHA-256 drift for ${artifactPath}.`)
    }
    return {
      source_run_id: variant.sourceRunId,
      source_step_id: `${manifest.canonicalProjectId}:${variant.sourceRunId}:step:${step.step_number}`,
      source_step_number: step.step_number,
      artifact_path: artifactPath,
      artifact_sha256: artifactSha256,
    }
  })
  if (artifactEvidence.length === 0) {
    throw new Error(`${packagePath}: model release needs response-level artifact evidence.`)
  }
  return {
    project_id: manifest.canonicalProjectId,
    source_run_id: variant.sourceRunId,
    provider_key: variant.providerKey,
    service_label: variant.serviceLabel,
    model_release_key: modelReleaseKey(variant),
    model_label: variant.modelLabel,
    model_settings: modelSettingsRecord(variant),
    source_url: sourcePackage.source_url,
    source_package_file: packagePath,
    source_package_sha256: variant.packageSha256,
    opening_prompt_sha256: manifest.contract.openingPromptSha256,
    comparison_contract_version: manifest.contract.version,
    comparison_contract_sha256: manifest.contract.sha256,
    operator_kind: variant.operatorKind.replaceAll('-', '_'),
    operator_label: variant.operatorLabel,
    automation_run_id: null,
    run_role: variant.runRole.replaceAll('-', '_'),
    quality_status: variant.qualityStatus.replaceAll('-', '_'),
    run_started_at: sourcePackage.run_started_at ?? null,
    run_finished_at: variant.capturedAt,
    prompt_count: variant.promptCount,
    repair_prompt_count: variant.repairPromptCount,
    first_artifact_path: variant.firstArtifactPath,
    final_artifact_path: variant.finalArtifactPath,
    artifact_version_paths: variant.artifactVersionPaths,
    first_pass_metrics: variant.firstPassMetrics,
    final_metrics: variant.finalMetrics,
    status: variant.runRole === 'historical-baseline' ? 'historical' : 'published',
    is_current: variant.isCurrent,
    is_default: variant.sourceRunId === manifest.defaultSourceRunId,
    supersedes_variant_id: null,
    _supersedesSourceRunId: variant.supersedesSourceRunId ?? null,
    _artifactEvidence: artifactEvidence,
    _sourceAccess: sourcePackage.source_access ?? null,
    _manifest: manifestPath,
  }
}

function comparableRow(row) {
  return Object.fromEntries(RELEASE_FIELDS.map((field) => [field, row[field] ?? null]))
}

function immutableComparableRow(row) {
  const result = comparableRow(row)
  delete result.is_current
  delete result.is_default
  return result
}

function normalizeTimestamp(value) {
  return value ? new Date(value).toISOString() : null
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

function normalizedComparableRow(row, immutable = false) {
  const normalized = immutable ? immutableComparableRow(row) : comparableRow(row)
  normalized.run_started_at = normalizeTimestamp(normalized.run_started_at)
  normalized.run_finished_at = normalizeTimestamp(normalized.run_finished_at)
  return stable(normalized)
}

function rowMatches(actual, expected, { immutable = false } = {}) {
  const normalizedActual = normalizedComparableRow(actual, immutable)
  const normalizedExpected = normalizedComparableRow(expected, immutable)
  return JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected)
}

function rowMatchesIgnoringDefault(actual, expected) {
  const normalizedActual = normalizedComparableRow(actual)
  const normalizedExpected = normalizedComparableRow(expected)
  delete normalizedActual.is_default
  delete normalizedExpected.is_default
  return JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected)
}

function publicSummary(rows, mode) {
  return rows.map((row) => ({
    mode,
    manifest: row._manifest,
    project_id: row.project_id,
    source_run_id: row.source_run_id,
    provider: row.service_label,
    model: row.model_label,
    role: row.run_role,
    status: row.status,
    default: row.is_default,
    source_url: row.source_url,
    source_access: row._sourceAccess?.mode ?? 'public_share',
    artifact: row.final_artifact_path,
  }))
}

async function verifyPublicSourceUrls(rows) {
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(4, rows.length) }, async () => {
    while (nextIndex < rows.length) {
      const row = rows[nextIndex]
      nextIndex += 1
      if (
        row.provider_key === 'anthropic' &&
        row._sourceAccess?.mode === 'authenticated_owner_session' &&
        row._sourceAccess?.public_share_unavailable === true &&
        typeof row._sourceAccess?.note === 'string' &&
        row._sourceAccess.note.trim()
      ) {
        continue
      }
      let response
      try {
        response = await fetch(row.source_url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(15_000),
          headers: { 'user-agent': 'PathForge release verification' },
        })
      } catch (error) {
        throw new Error(
          `${row.source_run_id}: public source URL could not be reached: ${error.message}`,
        )
      }
      await response.body?.cancel()
      if (!response.ok) {
        throw new Error(
          `${row.source_run_id}: public source URL returned HTTP ${response.status}.`,
        )
      }
    }
  })
  await Promise.all(workers)
}

async function prepareProjectRelease(supabase, manifestPath, rows) {
  const projectId = rows[0].project_id
  const { data: existing, error: readError } = await supabase
    .from('project_model_variants')
    .select(RELEASE_SELECT)
    .eq('project_id', projectId)
    .in('status', ['published', 'historical'])
  if (readError) throw readError

  const existingRows = existing ?? []
  const desiredRows = preserveExistingReleaseDefault({
    rows,
    existingRows,
    label: manifestPath,
  })
  const expectedBySourceRunId = new Map(
    desiredRows.map((row) => [row.source_run_id, row]),
  )

  for (const actual of existingRows) {
    if (!expectedBySourceRunId.has(actual.source_run_id)) {
      throw new Error(
        `${manifestPath}: checked release omits existing history row ${actual.source_run_id}.`,
      )
    }
  }

  const resolvedRows = resolveAppendReleaseLineage({
    rows: desiredRows,
    existingRows,
    label: manifestPath,
  })

  const resolvedBySourceRunId = new Map(
    resolvedRows.map((row) => [row.source_run_id, row]),
  )
  for (const actual of existingRows) {
    const expected = resolvedBySourceRunId.get(actual.source_run_id)
    if (!expected || !rowMatches(actual, expected, { immutable: true })) {
      throw new Error(
        `${manifestPath}: immutable database row ${actual.source_run_id} differs from the checked release.`,
      )
    }
  }

  const fullyMatchedBeforeRelease =
    existingRows.length === resolvedRows.length &&
    existingRows.every((actual) => {
      const expected = resolvedBySourceRunId.get(actual.source_run_id)
      return Boolean(expected && rowMatches(actual, expected))
    })

  const state = fullyMatchedBeforeRelease
    ? 'already_registered'
    : existingRows.length === resolvedRows.length
      ? 'release_reconciled'
    : existingRows.length === 0
      ? 'registered'
      : 'history_appended'
  return {
    manifestPath,
    projectId,
    state,
    rows: resolvedRows,
    releaseRows: resolvedRows.map(comparableRow),
  }
}

function artifactEvidenceForReleasedProject(release, releasedRows) {
  const modelVariantIdByRun = new Map(
    releasedRows.map((row) => [row.source_run_id, row.id]),
  )
  return release.rows.flatMap((row) => {
    const modelVariantId = modelVariantIdByRun.get(row.source_run_id)
    if (!modelVariantId) {
      throw new Error(
        `${release.manifestPath}: released model row ${row.source_run_id} has no database ID.`,
      )
    }
    return row._artifactEvidence.map((evidence) => ({
      model_variant_id: modelVariantId,
      ...evidence,
    }))
  })
}

async function applyCohort(supabase, releases) {
  const prepared = await Promise.all(
    releases.map((release) =>
      prepareProjectRelease(supabase, release.manifestPath, release.rows),
    ),
  )
  const cohortPayload = prepared.map((release) => ({
    project_id: release.projectId,
    release_rows: release.releaseRows,
  }))
  const { data: released, error: releaseError } = await supabase.rpc(
    'publish_project_model_variant_cohort',
    { releases: cohortPayload },
  )
  if (releaseError) throw releaseError

  const expectedRows = prepared.flatMap((release) => release.rows)
  const expectedBySourceRunId = new Map(
    expectedRows.map((row) => [row.source_run_id, row]),
  )
  if ((released ?? []).length !== expectedRows.length) {
    throw new Error('Atomic cohort release returned an incomplete provider history.')
  }
  for (const actual of released) {
    const expected = expectedBySourceRunId.get(actual.source_run_id)
    if (!expected || !rowMatchesIgnoringDefault(actual, expected)) {
      throw new Error(`Post-release evidence mismatch for ${actual.source_run_id}.`)
    }
  }
  const defaultsByProject = new Map()
  for (const actual of released ?? []) {
    if (!actual.is_default) continue
    defaultsByProject.set(
      actual.project_id,
      (defaultsByProject.get(actual.project_id) ?? 0) + 1,
    )
    if (
      actual.status !== 'published' ||
      actual.quality_status !== 'verified' ||
      actual.is_current !== true
    ) {
      throw new Error(`Post-release default ${actual.source_run_id} is not a current verified run.`)
    }
  }
  for (const release of prepared) {
    if (defaultsByProject.get(release.projectId) !== 1) {
      throw new Error(`${release.manifestPath}: atomic release did not retain exactly one default.`)
    }
  }
  const releasedByProject = new Map()
  for (const actual of released ?? []) {
    const projectRows = releasedByProject.get(actual.project_id) ?? []
    projectRows.push(actual)
    releasedByProject.set(actual.project_id, projectRows)
  }
  for (const release of prepared) {
    const projectRows = releasedByProject.get(release.projectId) ?? []
    const evidenceRows = artifactEvidenceForReleasedProject(release, projectRows)
    const { data: storedEvidence, error: evidenceError } = await supabase.rpc(
      'publish_project_model_variant_artifact_evidence',
      {
        target_project_id: release.projectId,
        evidence_rows: evidenceRows,
      },
    )
    if (evidenceError) throw evidenceError
    let storedEvidenceWithRunIdentity
    try {
      storedEvidenceWithRunIdentity = attachSourceRunIdentityToArtifactEvidence(
        storedEvidence ?? [],
        projectRows,
      )
    } catch (error) {
      throw new Error(
        `${release.manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    if (!artifactEvidenceMatches(storedEvidenceWithRunIdentity, evidenceRows)) {
      throw new Error(`${release.manifestPath}: stored response-artifact evidence is incomplete or drifted.`)
    }
  }
  return prepared.map((release) => ({
    ...release,
    rows: (releasedByProject.get(release.projectId) ?? []).map((row) => ({
      ...row,
      _manifest: release.manifestPath,
    })),
  }))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  loadEnvFile(args.envFile ? path.resolve(args.envFile) : path.join(root, '.env.local'))
  const releaseHead = assertReleaseWorkspaceAndProject(args)

  execFileSync('npm', ['run', 'check:model-variants'], {
    cwd: root,
    stdio: args.emitPayload ? ['ignore', 'ignore', 'inherit'] : 'inherit',
  })
  execFileSync('npm', ['run', 'check:artifact-sandbox'], {
    cwd: root,
    stdio: args.emitPayload ? ['ignore', 'ignore', 'inherit'] : 'inherit',
  })

  const releases = manifestPaths(args).map((manifestPath) => {
    const manifest = readJson(manifestPath)
    if (!Array.isArray(manifest.variants) || manifest.variants.length < 3) {
      throw new Error(`${manifestPath}: release manifest must contain at least three variants.`)
    }
    const rows = manifest.variants.map((variant) => releaseRow(manifestPath, manifest, variant))
    if (rows.filter((row) => row.is_default).length !== 1) {
      throw new Error(`${manifestPath}: release needs exactly one default variant.`)
    }
    return { manifestPath, rows }
  })

  await verifyPublicSourceUrls(releases.flatMap((release) => release.rows))

  const verifiedFinalArtifacts = [...new Set(
    releases
      .flatMap((release) => release.rows)
      .filter((row) => row.quality_status === 'verified')
      .map((row) => row.final_artifact_path),
  )]
  execFileSync(
    process.execPath,
    [path.join(root, 'scripts/measure-html-artifacts.mjs'), ...verifiedFinalArtifacts],
    {
      cwd: root,
      stdio: args.emitPayload ? ['ignore', 'ignore', 'inherit'] : 'inherit',
    },
  )

  assertReleaseCandidateUnchanged(releaseHead)

  if (!args.apply) {
    if (args.emitPayload) {
      const unresolvedSupersession = releases
        .flatMap((release) => release.rows)
        .find((row) => row._supersedesSourceRunId)
      if (unresolvedSupersession) {
        throw new Error(
          `--emit-payload cannot resolve supersession for ${unresolvedSupersession.source_run_id}; use --apply with a server secret.`,
        )
      }
      const payload = `${JSON.stringify({
        cohort_releases: releases.map((release) => ({
          project_id: release.rows[0].project_id,
          release_rows: release.rows.map(comparableRow),
        })),
        response_artifact_evidence_plan: releases.map((release) => ({
          target_project_id: release.rows[0].project_id,
          rows_by_source_run: release.rows.flatMap((row) => row._artifactEvidence),
          next_step: 'After publish_project_model_variant_cohort returns database row IDs, add model_variant_id by source_run_id and call publish_project_model_variant_artifact_evidence.',
        })),
      }, null, 2)}\n`
      if (args.output) {
        const outputPath = path.resolve(args.output)
        writeFileSync(outputPath, payload)
        console.error(`Wrote checked model-variant cohort payload to ${outputPath}.`)
      } else {
        process.stdout.write(payload)
      }
      return
    }
    console.log(JSON.stringify(publicSummary(releases.flatMap((release) => release.rows), 'dry_run'), null, 2))
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = resolveSupabaseServerKey(process.env)
  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  const supabase = createSupabaseServerClient(supabaseUrl, secretKey)

  const results = await applyCohort(supabase, releases)
  console.log(JSON.stringify(
    results.flatMap((result) => publicSummary(result.rows, result.state)),
    null,
    2,
  ))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
