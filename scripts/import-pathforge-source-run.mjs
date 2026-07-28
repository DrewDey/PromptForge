#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import {
  createSupabaseServerClient,
  resolveSupabaseServerKey,
} from '../src/lib/supabase/server-client.mjs'
import {
  assertAuthoritativePreparedLegacyProfileBinding,
  assertPreparedLegacyPackageBinding,
} from '../src/lib/prepared-legacy-source-runs.mjs'

const POSTGRES_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PUBLIC_PROVIDER_SHARE_URL_PATTERN =
  /^https:\/\/(chatgpt\.com\/share\/[A-Za-z0-9-]+|claude\.ai\/share\/[A-Za-z0-9-]+|g\.co\/gemini\/share\/[A-Za-z0-9-]+|gemini\.google\.com\/share\/[A-Za-z0-9-]+)\/?$/

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}

function parseArgs(argv) {
  const args = {
    package: '',
    username: 'JordanLee',
    displayName: '',
    email: '',
    authMode: 'auto',
    passwordEnv: 'PATHFORGE_SEED_PASSWORD',
    dryRun: false,
    emitIntakeJson: false,
    profileId: '',
    usernameExplicit: false,
    displayNameExplicit: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      args.dryRun = true
      continue
    }
    if (arg === '--emit-intake-json') {
      args.emitIntakeJson = true
      continue
    }
    if (arg === '--submit-draft') {
      throw new Error(
        '--submit-draft has been disabled. Source-run imports may only create ' +
        'source_run_submissions queue entries. Build/public prompt pages must be ' +
        'created later by an explicit admin review/publish step.'
      )
    }
    if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())
      args[key] = argv[i + 1]
      if (key === 'username') args.usernameExplicit = true
      if (key === 'displayName') args.displayNameExplicit = true
      i += 1
    }
  }

  args.displayName = args.displayName.trim() || args.username
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .trim()

  if (!args.package) {
    throw new Error('Usage: node scripts/import-pathforge-source-run.mjs --package seed-runs/example.json [--username JordanLee] [--display-name "Jordan Lee"] [--auth-mode auto|public-signup|password] [--dry-run] [--emit-intake-json --profile-id <uuid>]')
  }
  if (args.dryRun && args.emitIntakeJson) {
    throw new Error('Use either --dry-run or --emit-intake-json, not both.')
  }
  if (args.emitIntakeJson && !POSTGRES_UUID_PATTERN.test(args.profileId)) {
    throw new Error('--emit-intake-json requires --profile-id with the exact non-admin profile UUID.')
  }

  return args
}

function requireString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Seed package is missing ${fieldName}.`)
  }
  return value.trim()
}

function optionalString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function canonicalSourceUrl(value) {
  const parsed = new URL(requireString(value, 'source_url').toLowerCase())
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Seed package source_url must use http or https.')
  }
  const hostname = parsed.hostname.replace(/^www\./, '')
  const port = parsed.port ? `:${parsed.port}` : ''
  const pathname = parsed.pathname.replace(/\/+$/, '')
  const queryParts = parsed.search.slice(1).split('&').filter((part) => {
    if (!part) return false
    const key = part.split('=', 1)[0]
    return !key.startsWith('utm_') && !['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(key)
  }).sort()
  return `${parsed.protocol}//${hostname}${port}${pathname}${queryParts.length ? `?${queryParts.join('&')}` : ''}`
}

function requirePublicProviderShareUrl(value) {
  const sourceUrl = requireString(value, 'source_url')
  if (!PUBLIC_PROVIDER_SHARE_URL_PATTERN.test(sourceUrl)) {
    throw new Error(
      'Use a public ChatGPT, Claude, or Gemini share link without a query string or fragment. Private conversation URLs are not accepted.',
    )
  }
  return sourceUrl
}

function checkedPackageSourceRunId(pkg) {
  const sourceRunId = optionalString(pkg.source_run_id)
  if (sourceRunId && !POSTGRES_UUID_PATTERN.test(sourceRunId)) {
    throw new Error('Seed package source_run_id must be a valid UUID when supplied.')
  }
  return sourceRunId
}

function bindPreparedLegacyIdentity(args, pkg) {
  const binding = assertPreparedLegacyPackageBinding(pkg)
  if (!binding) return null
  if (args.usernameExplicit && args.username !== binding.username) {
    throw new Error(
      `Prepared legacy package ${binding.sourceRunId} must be imported as ${binding.username}, not ${args.username}.`,
    )
  }
  if (args.displayNameExplicit && args.displayName !== binding.displayName) {
    throw new Error(
      `Prepared legacy package ${binding.sourceRunId} must use display name ${binding.displayName}.`,
    )
  }
  args.username = binding.username
  args.displayName = binding.displayName
  return binding
}

function formatModelSettings(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map(optionalString).filter(Boolean).join('; ')
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entry]) => {
        const text = typeof entry === 'string' ? entry.trim() : JSON.stringify(entry)
        return text ? `${key}: ${text}` : ''
      })
      .filter(Boolean)
      .join('; ')
  }
  return String(value).trim()
}

function packageNotes(value) {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') return entry.trim()
        if (entry && typeof entry === 'object') return JSON.stringify(entry)
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function forkSubmissionFields(value) {
  if (!value) return {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Seed package fork_source must be an object.')
  }

  const sourceProjectId = requireString(value.source_project_id, 'fork_source.source_project_id')
  const sourceStepId = optionalString(value.source_step_id)
  const sourceStepNumber = Number(value.source_step_number)
  if (!sourceStepId && (!Number.isInteger(sourceStepNumber) || sourceStepNumber < 1)) {
    throw new Error('Seed package fork_source needs an exact source_step_id or positive source_step_number.')
  }

  const sourceRunId = optionalString(value.source_run_id)
  const sourceArtifactPath = optionalString(value.source_artifact_path)
  const sourceArtifactSha256 = optionalString(value.source_artifact_sha256).toLowerCase()
  if (
    sourceRunId &&
    (
      !sourceStepId ||
      !Number.isInteger(sourceStepNumber) ||
      sourceStepNumber < 1
    )
  ) {
    throw new Error('Variant-aware forks require both source_step_id and source_step_number.')
  }
  if (
    sourceRunId &&
    sourceStepId !== `${sourceProjectId}:${sourceRunId}:step:${sourceStepNumber}`
  ) {
    throw new Error('Variant-aware fork source_step_id does not match its project, run, and step number.')
  }
  if (
    sourceRunId &&
    (
      !sourceArtifactPath.startsWith('public/artifacts/') ||
      sourceArtifactPath.includes('..') ||
      sourceArtifactPath.includes('\\') ||
      !/^[0-9a-f]{64}$/.test(sourceArtifactSha256)
    )
  ) {
    throw new Error('Variant-aware forks require a safe artifact path and lowercase SHA-256.')
  }
  const forkDepth = value.fork_depth === undefined ? 0 : Number(value.fork_depth)
  const forkBranchIndex = value.fork_branch_index === undefined
    ? 0
    : Number(value.fork_branch_index)
  if (!Number.isInteger(forkDepth) || forkDepth < 0 || forkDepth > 8) {
    throw new Error('Seed package fork_depth must be an integer from 0 through 8.')
  }
  if (!Number.isInteger(forkBranchIndex) || forkBranchIndex < 0 || forkBranchIndex >= 10) {
    throw new Error('Seed package fork_branch_index must be an integer from 0 through 9.')
  }

  return {
    fork_source_project_id: sourceProjectId,
    fork_source_project_title: optionalString(value.source_project_title) || null,
    fork_source_model_variant_id: optionalString(value.source_model_variant_id) || null,
    fork_source_run_id: sourceRunId || null,
    fork_source_step_id: sourceStepId || null,
    fork_source_step_number: Number.isInteger(sourceStepNumber) && sourceStepNumber > 0
      ? sourceStepNumber
      : null,
    fork_source_artifact_path: sourceArtifactPath || null,
    fork_source_artifact_sha256: sourceArtifactSha256 || null,
    fork_parent_submission_id: optionalString(value.parent_fork_id) || null,
    prompt_family_id: optionalString(value.prompt_family_id) || null,
    fork_depth: forkDepth,
    fork_branch_index: forkBranchIndex,
  }
}

function validatePackageSteps(pkg) {
  if (!Array.isArray(pkg.steps) || pkg.steps.length === 0) {
    throw new Error('Seed package must preserve at least one exact prompt/response step.')
  }

  const seen = new Set()
  pkg.steps.forEach((step, index) => {
    const stepNumber = step?.step_number
    if (!Number.isInteger(stepNumber) || stepNumber < 1) {
      throw new Error(`Seed package step ${index + 1} needs a positive integer step_number.`)
    }
    if (seen.has(stepNumber)) {
      throw new Error(`Seed package repeats step_number ${stepNumber}.`)
    }
    if (index > 0 && stepNumber !== pkg.steps[index - 1].step_number + 1) {
      throw new Error('Seed package step identities must be positive, unique, and sequential.')
    }
    if (typeof step.prompt_exact !== 'string' || typeof step.response_exact !== 'string') {
      throw new Error(`Seed package step ${stepNumber} must preserve exact prompt and response text.`)
    }
    seen.add(stepNumber)
  })

  if (pkg.prompt_count !== undefined && pkg.prompt_count !== pkg.steps.length) {
    throw new Error('Seed package prompt_count must equal its exact step evidence count.')
  }
}

function packageContext(packageArgument) {
  const seedRunsRoot = resolve(process.cwd(), 'seed-runs')
  const packagePath = resolve(process.cwd(), packageArgument)
  if (packagePath !== seedRunsRoot && !packagePath.startsWith(`${seedRunsRoot}${sep}`)) {
    throw new Error('Seed package path must remain under seed-runs/.')
  }
  const relativeFile = relative(seedRunsRoot, packagePath).split(sep).join('/')
  if (!relativeFile || relativeFile.split('/').some((segment) => segment === '..' || !segment)) {
    throw new Error('Seed package path is not a normalized seed-runs file.')
  }
  const bytes = readFileSync(packagePath)
  return {
    packagePath,
    sourcePackageFile: `seed-runs/${relativeFile}`,
    sourcePackageSha256: createHash('sha256').update(bytes).digest('hex'),
    bytes,
    seedRunsRoot,
  }
}

function listJsonFiles(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name)
    if (entry.isDirectory()) return listJsonFiles(entryPath)
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : []
  })
}

function reconcileForkWithParentPackage(pkg, context) {
  const fields = forkSubmissionFields(pkg.fork_source)
  if (!fields.fork_source_run_id) return fields

  const expectedStepId = `${fields.fork_source_project_id}:${fields.fork_source_run_id}:step:${fields.fork_source_step_number}`
  if (fields.fork_source_step_id !== expectedStepId) {
    throw new Error('Variant-aware fork step identity is not canonical.')
  }

  const artifactPath = resolve(process.cwd(), fields.fork_source_artifact_path)
  const artifactRoot = resolve(process.cwd(), 'public/artifacts')
  if (!artifactPath.startsWith(`${artifactRoot}${sep}`) || !existsSync(artifactPath)) {
    throw new Error('Variant-aware fork source artifact is missing from public/artifacts.')
  }
  const actualArtifactSha = createHash('sha256').update(readFileSync(artifactPath)).digest('hex')
  if (actualArtifactSha !== fields.fork_source_artifact_sha256) {
    throw new Error('Variant-aware fork source artifact SHA-256 does not match the local artifact.')
  }

  const parentMatches = listJsonFiles(context.seedRunsRoot).flatMap((candidatePath) => {
    if (candidatePath === context.packagePath) return []
    try {
      const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'))
      const candidateRunId = optionalString(candidate.source_run_id || candidate.source_run_submission_id)
      return candidateRunId === fields.fork_source_run_id ? [{ candidatePath, candidate }] : []
    } catch {
      return []
    }
  })
  if (parentMatches.length > 1) {
    throw new Error(`Multiple parent packages claim source run ${fields.fork_source_run_id}.`)
  }
  if (parentMatches.length === 0) return fields

  const parentStep = parentMatches[0].candidate.steps?.find(
    (step) => step?.step_number === fields.fork_source_step_number,
  )
  if (!parentStep) {
    throw new Error('Variant-aware fork source step does not exist in the parent package.')
  }
  if (optionalString(parentStep.artifact_version_path) !== fields.fork_source_artifact_path) {
    throw new Error('Variant-aware fork source artifact path does not match the parent package step.')
  }
  if (optionalString(parentStep.artifact_sha256).toLowerCase() !== fields.fork_source_artifact_sha256) {
    throw new Error('Variant-aware fork source artifact digest does not match the parent package step.')
  }
  return fields
}

function canonicalForkEvidence(fields) {
  if (!fields.fork_source_project_id) return null
  return {
    source_project_id: optionalString(fields.fork_source_project_id),
    source_project_title: optionalString(fields.fork_source_project_title) || null,
    source_model_variant_id: optionalString(fields.fork_source_model_variant_id) || null,
    source_run_id: optionalString(fields.fork_source_run_id) || null,
    source_step_id: optionalString(fields.fork_source_step_id) || null,
    source_step_number: Number.isInteger(fields.fork_source_step_number)
      ? fields.fork_source_step_number
      : null,
    source_artifact_path: optionalString(fields.fork_source_artifact_path) || null,
    source_artifact_sha256: optionalString(fields.fork_source_artifact_sha256).toLowerCase() || null,
    parent_fork_id: optionalString(fields.fork_parent_submission_id) || null,
    prompt_family_id: optionalString(fields.prompt_family_id) || null,
    fork_depth: Number.isInteger(fields.fork_depth) ? fields.fork_depth : 0,
    fork_branch_index: Number.isInteger(fields.fork_branch_index) ? fields.fork_branch_index : 0,
  }
}

function normalizedReviewNotes(value) {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (!Array.isArray(value)) return []
  return value.map((entry) => typeof entry === 'string' ? entry.trim() : entry)
    .filter((entry) => typeof entry !== 'string' || Boolean(entry))
}

function buildIntakeEvidence({ pkg, forkFields, preparedBinding = null }) {
  if (!preparedBinding) requirePublicProviderShareUrl(pkg.source_url)
  const finalArtifactPath = requireString(pkg.final_artifact_path, 'final_artifact_path')
  const finalArtifactSha256 = requireString(pkg.artifact_sha256, 'artifact_sha256').toLowerCase()
  const profileRegistryId = requireString(
    pkg.submitted_by_profile_registry_id,
    'submitted_by_profile_registry_id',
  )
  if (profileRegistryId.startsWith('prepared-showcase-mock-')) {
    throw new Error(
      'Seed package submitted_by_profile_registry_id must reference a durable authorized profile, not a prepared showcase mock.',
    )
  }
  if (
    !finalArtifactPath.startsWith('public/artifacts/') ||
    finalArtifactPath.includes('..') ||
    finalArtifactPath.includes('\\')
  ) {
    throw new Error('Seed package final_artifact_path must be a safe public/artifacts path.')
  }
  if (!/^[0-9a-f]{64}$/.test(finalArtifactSha256)) {
    throw new Error('Seed package artifact_sha256 must be a lowercase SHA-256.')
  }
  return {
    schema_version: 1,
    provider: requireString(pkg.provider, 'provider'),
    model_used: requireString(pkg.model || pkg.model_used, 'model'),
    model_settings: formatModelSettings(pkg.model_settings),
    prompt_count: pkg.prompt_count ?? pkg.steps.length,
    final_artifact_path: finalArtifactPath,
    final_artifact_sha256: finalArtifactSha256,
    profile_registry_id: profileRegistryId,
    verification_notes: normalizedReviewNotes(pkg.verification_notes),
    artifact_version_notes: Array.isArray(pkg.artifact_version_notes)
      ? pkg.artifact_version_notes
      : [],
    source_inspiration_notes: Array.isArray(pkg.source_inspiration_notes)
      ? pkg.source_inspiration_notes
      : [],
    ...(preparedBinding ? {
      evidence_scope: optionalString(pkg.evidence_scope) || null,
      source_access: pkg.source_access && typeof pkg.source_access === 'object'
        ? pkg.source_access
        : null,
      response_capture_normalization:
        pkg.response_capture_normalization &&
        typeof pkg.response_capture_normalization === 'object'
          ? pkg.response_capture_normalization
          : null,
      omitted_provider_turns: Array.isArray(pkg.omitted_provider_turns)
        ? pkg.omitted_provider_turns
        : [],
    } : {}),
    fork: canonicalForkEvidence(forkFields),
  }
}

function buildSubmissionPayload({
  pkg,
  profile,
  context,
  forkFields,
  preparedBinding = null,
}) {
  const sourceUrl = requireString(pkg.source_url, 'source_url')
  return {
    ...(checkedPackageSourceRunId(pkg) ? { id: checkedPackageSourceRunId(pkg) } : {}),
    title: pkg.title,
    source_url: sourceUrl,
    canonical_source_url: canonicalSourceUrl(sourceUrl),
    file_name: null,
    notes: makeAgentNotes(pkg),
    ...forkFields,
    source_package_file: context.sourcePackageFile,
    source_package_sha256: context.sourcePackageSha256,
    intake_evidence: buildIntakeEvidence({ pkg, forkFields, preparedBinding }),
    author_id: profile.id,
    status: 'queued',
  }
}

function immutableLegacyIntake(payload) {
  return {
    author_id: payload.author_id,
    title: payload.title,
    source_url: payload.source_url,
    canonical_source_url: payload.canonical_source_url,
    file_name: null,
    notes: payload.notes,
    source_package_file: payload.source_package_file,
    source_package_sha256: payload.source_package_sha256,
    intake_evidence: payload.intake_evidence,
  }
}

function legacyImportRpcArgs(binding, payload, forkFields) {
  return {
    target_source_run_id: binding.sourceRunId,
    expected_project_id: binding.projectId,
    immutable_intake: immutableLegacyIntake(payload),
    immutable_fork: canonicalForkEvidence(forkFields),
  }
}

function legacyImportHandoff(binding, payload, forkFields) {
  return {
    rpc: 'import_legacy_prepared_source_run',
    args: legacyImportRpcArgs(binding, payload, forkFields),
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function normalizeImmutablePayload(payload) {
  const normalized = {
    title: optionalString(payload.title) || null,
    source_url: optionalString(payload.source_url) || null,
    canonical_source_url: optionalString(payload.canonical_source_url) || null,
    file_name: optionalString(payload.file_name) || null,
    notes: typeof payload.notes === 'string' ? payload.notes.replace(/\r\n/g, '\n').trim() : null,
    author_id: optionalString(payload.author_id) || null,
    source_package_file: optionalString(payload.source_package_file) || null,
    source_package_sha256: optionalString(payload.source_package_sha256).toLowerCase() || null,
    intake_evidence: payload.intake_evidence ?? null,
  }
  for (const [key, value] of Object.entries(canonicalForkEvidence(payload) ?? {})) {
    const payloadKey = key === 'source_project_id' ? 'fork_source_project_id'
      : key === 'source_project_title' ? 'fork_source_project_title'
      : key === 'source_model_variant_id' ? 'fork_source_model_variant_id'
        : key === 'source_run_id' ? 'fork_source_run_id'
          : key === 'source_step_id' ? 'fork_source_step_id'
            : key === 'source_step_number' ? 'fork_source_step_number'
              : key === 'source_artifact_path' ? 'fork_source_artifact_path'
                : key === 'source_artifact_sha256' ? 'fork_source_artifact_sha256'
                  : key === 'parent_fork_id' ? 'fork_parent_submission_id'
                    : key
    normalized[payloadKey] = value
  }
  return normalized
}

function immutablePayloadDifferences(expected, actual) {
  const expectedNormalized = normalizeImmutablePayload(expected)
  const actualNormalized = normalizeImmutablePayload(actual)
  const keys = new Set([...Object.keys(expectedNormalized), ...Object.keys(actualNormalized)])
  return [...keys].filter(
    (key) => stableJson(expectedNormalized[key]) !== stableJson(actualNormalized[key]),
  )
}

async function resolveVariantForkFields(importClient, forkFields) {
  if (!forkFields.fork_source_run_id) return forkFields
  const { data: sourceVariant, error: sourceVariantError } = await importClient
    .from('project_model_variants')
    .select('id, project_id, source_run_id, artifact_version_paths')
    .eq('project_id', forkFields.fork_source_project_id)
    .eq('source_run_id', forkFields.fork_source_run_id)
    .maybeSingle()

  if (sourceVariantError) throw sourceVariantError
  if (sourceVariant) {
    if (
      forkFields.fork_source_model_variant_id &&
      forkFields.fork_source_model_variant_id !== sourceVariant.id
    ) {
      throw new Error('Variant-aware fork model variant does not match its project and source run.')
    }
    if (!(sourceVariant.artifact_version_paths ?? []).includes(forkFields.fork_source_artifact_path)) {
      throw new Error('Variant-aware fork source artifact does not belong to the selected model run.')
    }
    return {
      ...forkFields,
      fork_source_model_variant_id: sourceVariant.id,
    }
  }

  if (forkFields.fork_source_model_variant_id) {
    throw new Error('The selected model variant is not published for this project and source run.')
  }

  const { data: sourceIntake, error: sourceIntakeError } = await importClient
    .from('source_run_submissions')
    .select('id, status, extracted_prompt_id, intake_evidence')
    .eq('id', forkFields.fork_source_run_id)
    .eq('extracted_prompt_id', forkFields.fork_source_project_id)
    .maybeSingle()
  if (sourceIntakeError) throw sourceIntakeError

  const evidence = sourceIntake?.intake_evidence
  const exactPreparedFinal = Boolean(
    sourceIntake?.status === 'draft_created' &&
    evidence &&
    Number(evidence.prompt_count) === forkFields.fork_source_step_number &&
    forkFields.fork_source_step_id === (
      `${forkFields.fork_source_project_id}:${forkFields.fork_source_run_id}:step:${forkFields.fork_source_step_number}`
    ) &&
    evidence.final_artifact_path === forkFields.fork_source_artifact_path &&
    evidence.final_artifact_sha256 === forkFields.fork_source_artifact_sha256
  )
  if (!exactPreparedFinal) {
    throw new Error(
      'Exact-run fork source is neither a published model variant nor the immutable final response of an approved prepared project.',
    )
  }
  return forkFields
}

function makeAgentNotes(pkg) {
  const provider = optionalString(pkg.provider)
  const modelUsed = optionalString(pkg.model || pkg.model_used)
  const modelSettings = formatModelSettings(pkg.model_settings)
  const notes = packageNotes(pkg.agent_notes)
  const forkSource = pkg.fork_source && typeof pkg.fork_source === 'object'
    ? pkg.fork_source
    : null
  const forkNotes = forkSource ? [
    `Fork source project: ${optionalString(forkSource.source_project_id) || 'Not specified'}`,
    `Fork source model variant: ${optionalString(forkSource.source_model_variant_id) || 'Resolved on publish'}`,
    `Fork source run: ${optionalString(forkSource.source_run_id) || 'Legacy canonical run'}`,
    `Fork source artifact: ${optionalString(forkSource.source_artifact_path) || 'Not specified'}`,
    `Fork source artifact SHA-256: ${optionalString(forkSource.source_artifact_sha256) || 'Not specified'}`,
    `Fork point response: ${optionalString(forkSource.source_step_id) || `Response ${forkSource.source_step_number ?? 'not specified'}`}`,
    `Parent fork: ${optionalString(forkSource.parent_fork_id) || 'None'}`,
    `Prompt family: ${optionalString(forkSource.prompt_family_id) || 'Not specified'}`,
    `Fork coordinates: depth ${forkSource.fork_depth ?? 0}, branch ${forkSource.fork_branch_index ?? 0}`,
  ].join('\n') : ''

  return [
    `Provider: ${provider || 'Not specified'}`,
    `Model used: ${modelUsed || 'Not specified'}`,
    `Model settings: ${modelSettings || 'Not specified'}`,
    forkNotes,
    notes,
  ].filter(Boolean).join('\n\n')
}

function publicResult({
  sourceRunId,
  sourceRunStatus,
  pkg,
  profile,
  dryRun,
  loginIdentifier,
  preparedBinding = null,
  inserted = null,
}) {
  const status = sourceRunStatus || 'queued'
  const result = {
    dry_run: dryRun,
    mode: preparedBinding
      ? 'legacy-prepared-source-run-intake'
      : 'source-run-intake',
    title: pkg.title,
    status,
    author_username: profile?.username ?? null,
    author_profile_url: profile?.username ? `/user/${profile.username}` : null,
    profile_id: profile?.id ?? null,
    source_url: preparedBinding ? null : (pkg.source_url || null),
    source_url_scope: preparedBinding
      ? 'private immutable package evidence; not emitted'
      : 'ordinary public-share intake',
    artifact_path: pkg.final_artifact_path || null,
    login_identifier: loginIdentifier ?? null,
    expected_project_id: preparedBinding?.projectId ?? null,
    profile_registry_id: preparedBinding?.registryId ?? null,
    inserted,
  }

  return {
    ...result,
    source_run_submission_id: sourceRunId,
    admin_queue: status === 'queued' ? 'pending review' : null,
    next_step: status === 'queued'
      ? 'Admin reviews the source-run intake. No prompt/upvote page is created by this importer.'
      : `Existing immutable intake is already in status ${status}; no duplicate row was created.`,
  }
}

function makePassword() {
  return `${randomBytes(32).toString('base64url')}aA1!`
}

function makeSyntheticEmail(username) {
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${username.toLowerCase()}.${suffix}@pathforge-seed.example.com`
}

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, character => `\\${character}`)
}

async function createServiceRoleClient(supabaseUrl, serviceRoleKey) {
  return createSupabaseServerClient(supabaseUrl, serviceRoleKey)
}

async function createSyntheticSessionClient(supabaseUrl, anonKey, args) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const email = args.email || makeSyntheticEmail(args.username)
  const password = makePassword()
  const { data: handleMatches, error: handleError } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', escapeLikePattern(args.username))
    .limit(5)

  if (handleError) throw handleError
  if ((handleMatches ?? []).some(profile => profile.username?.toLowerCase() === args.username.toLowerCase())) {
    throw new Error(
      `Profile handle ${args.username} already exists. Public signup cannot attach a new auth user to that profile; use --auth-mode password with the existing account or configure a server-only Supabase credential.`,
    )
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: args.username,
        display_name: args.displayName,
      },
    },
  })

  if (error) throw error
  if (!data.session || !data.user) {
    throw new Error('Public signup created no active session. Email confirmation is probably required; use the service-role provisioner path.')
  }

  return {
    supabase,
    profile: {
      id: data.user.id,
      username: args.username,
    },
    createdEmail: email,
  }
}

async function createPasswordSessionClient(supabaseUrl, anonKey, args) {
  const password = process.env[args.passwordEnv]
  if (!args.email) {
    throw new Error('Password auth mode requires --email for the existing seed profile.')
  }
  if (!password) {
    throw new Error(`Password auth mode requires ${args.passwordEnv} in the environment. Do not put it in source or the profile registry.`)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: args.email,
    password,
  })

  if (error) throw error
  if (!data.session || !data.user) {
    throw new Error('Password sign-in did not return an active session.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) throw new Error('Signed-in user has no PathForge profile row.')

  return {
    supabase,
    profile,
    loginIdentifier: args.email,
  }
}

async function requirePreparedLegacyProfile(importClient, binding) {
  const { data: profile, error: profileError } = await importClient
    .from('profiles')
    .select('id, username, display_name, role')
    .eq('username', binding.username)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) {
    throw new Error(
      `No profile found for ${binding.username}. Run scripts/create-pathforge-seed-profile.mjs with the exact package first.`,
    )
  }

  const { data: verifiedRows, error: verifiedError } = await importClient.rpc(
    'check_prepared_legacy_seed_profile_binding',
    {
      target_profile_id: profile.id,
      expected_username: binding.username,
      expected_display_name: binding.displayName,
    },
  )
  if (verifiedError) throw verifiedError
  const verified = Array.isArray(verifiedRows) ? verifiedRows[0] : verifiedRows
  if (!verified || verified.profile_id !== profile.id) {
    throw new Error(
      `${binding.username} lacks its confirmed private seed-operator binding.`,
    )
  }
  assertAuthoritativePreparedLegacyProfileBinding(binding, verified)
  return {
    id: verified.profile_id,
    username: verified.username,
    display_name: verified.display_name,
    role: verified.role,
  }
}

function normalizeLegacyImportResult(data, binding) {
  const row = Array.isArray(data) ? data[0] : data
  if (
    !row ||
    row.source_run_id !== binding.sourceRunId ||
    typeof row.status !== 'string' ||
    typeof row.inserted !== 'boolean'
  ) {
    throw new Error('Legacy prepared source-run RPC returned an invalid result.')
  }
  return {
    id: row.source_run_id,
    status: row.status,
    inserted: row.inserted,
  }
}

async function importPreparedLegacySourceRun(
  importClient,
  binding,
  pkg,
  profile,
  context,
) {
  const forkFields = reconcileForkWithParentPackage(pkg, context)
  const payload = buildSubmissionPayload({
    pkg,
    profile,
    context,
    forkFields,
    preparedBinding: binding,
  })
  const { data, error } = await importClient.rpc(
    'import_legacy_prepared_source_run',
    legacyImportRpcArgs(binding, payload, forkFields),
  )
  if (error) throw error
  return normalizeLegacyImportResult(data, binding)
}

async function insertSourceRunSubmission(
  importClient,
  pkg,
  profile,
  context,
  preparedBinding = null,
) {
  if (preparedBinding) {
    return importPreparedLegacySourceRun(
      importClient,
      preparedBinding,
      pkg,
      profile,
      context,
    )
  }
  const reconciledForkFields = reconcileForkWithParentPackage(pkg, context)
  const forkFields = await resolveVariantForkFields(importClient, reconciledForkFields)
  const checkedSourceRunId = checkedPackageSourceRunId(pkg)
  const payload = buildSubmissionPayload({ pkg, profile, context, forkFields })

  if (checkedSourceRunId) {
    const { data: existing, error: existingError } = await importClient
      .from('source_run_submissions')
      .select('id, status, title, source_url, canonical_source_url, file_name, notes, author_id, source_package_file, source_package_sha256, intake_evidence, fork_source_project_id, fork_source_project_title, fork_source_model_variant_id, fork_source_run_id, fork_source_step_id, fork_source_step_number, fork_source_artifact_path, fork_source_artifact_sha256, fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index')
      .eq('id', checkedSourceRunId)
      .maybeSingle()

    if (existingError) {
      const message = String(existingError.message || '').toLowerCase()
      if (
        ['42703', 'PGRST204'].includes(existingError.code) &&
        (
          message.includes('canonical_source_url') ||
          message.includes('source_package_file') ||
          message.includes('source_package_sha256') ||
          message.includes('intake_evidence')
        )
      ) {
        throw new Error(
          'Immutable intake evidence columns are missing. Apply the checked source-run integrity migration before importing packages.'
        )
      }
      throw existingError
    }
    if (existing) {
      const differences = immutablePayloadDifferences(payload, existing)
      if (differences.length > 0) {
        throw new Error(
          `Checked source_run_id ${checkedSourceRunId} already belongs to different intake evidence: ${differences.join(', ')}.`
        )
      }
      return existing
    }
  }

  const { data, error } = await importClient
    .from('source_run_submissions')
    .insert(payload)
    .select('id, status')
    .single()

  if (!error) return data

  const errorMessage = String(error.message || '').toLowerCase()
  if (
    ['42703', 'PGRST204'].includes(error.code) &&
    (
      errorMessage.includes('canonical_source_url') ||
      errorMessage.includes('source_package_file') ||
      errorMessage.includes('source_package_sha256') ||
      errorMessage.includes('intake_evidence')
    )
  ) {
    throw new Error(
      'Immutable intake evidence columns are missing. Apply the checked source-run integrity migration before importing packages.'
    )
  }
  if (pkg.fork_source && ['42703', 'PGRST204'].includes(error.code)) {
    throw new Error(
      'Fork intake schema is missing required lineage columns. Apply the checked fork migration before importing this package.'
    )
  }

  if (
    error.code !== '42703' &&
    !(errorMessage.includes('title') && errorMessage.includes('source_run_submissions'))
  ) {
    throw error
  }

  const { data: fallbackData, error: fallbackError } = await importClient
    .from('source_run_submissions')
    .insert({
      ...(checkedSourceRunId ? { id: checkedSourceRunId } : {}),
      source_url: payload.source_url,
      canonical_source_url: payload.canonical_source_url,
      file_name: null,
      notes: [`Title: ${pkg.title}`, payload.notes].join('\n\n'),
      author_id: profile.id,
      source_package_file: context.sourcePackageFile,
      source_package_sha256: context.sourcePackageSha256,
      intake_evidence: payload.intake_evidence,
      status: 'queued',
    })
    .select('id, status')
    .single()

  if (fallbackError) throw fallbackError
  return fallbackData
}

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env.local'))

  const args = parseArgs(process.argv.slice(2))
  const context = packageContext(args.package)
  const pkg = JSON.parse(context.bytes.toString('utf8'))

  pkg.title = requireString(pkg.title, 'title')
  pkg.source_url = requireString(pkg.source_url, 'source_url')
  pkg.provider = requireString(pkg.provider, 'provider')
  pkg.model = requireString(pkg.model || pkg.model_used, 'model')
  const preparedBinding = bindPreparedLegacyIdentity(args, pkg)
  const checkedSourceRunId = checkedPackageSourceRunId(pkg)
  validatePackageSteps(pkg)
  canonicalSourceUrl(pkg.source_url)
  const validatedForkFields = reconcileForkWithParentPackage(pkg, context)
  buildIntakeEvidence({
    pkg,
    forkFields: validatedForkFields,
    preparedBinding,
  })

  if (args.emitIntakeJson) {
    const payload = buildSubmissionPayload({
      pkg,
      profile: { id: args.profileId, username: args.username },
      context,
      forkFields: validatedForkFields,
      preparedBinding,
    })
    console.log(JSON.stringify(
      preparedBinding
        ? legacyImportHandoff(preparedBinding, payload, validatedForkFields)
        : payload,
      null,
      2,
    ))
    return
  }

  if (args.dryRun) {
    console.log(JSON.stringify(publicResult({
      sourceRunId: checkedSourceRunId || 'dry-run-source-run-submission-id',
      sourceRunStatus: 'queued',
      pkg,
      profile: {
        id: 'dry-run-user-id',
        username: args.username,
      },
      dryRun: true,
      preparedBinding,
    }), null, 2))
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasConfiguredServerKey = Boolean(
    process.env.SUPABASE_SECRET_KEY?.trim()
      || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  )
  if (preparedBinding && args.authMode !== 'auto') {
    throw new Error('Prepared legacy imports require --auth-mode auto and a service-role key.')
  }
  const serverKey = args.authMode === 'auto' && hasConfiguredServerKey
    ? resolveSupabaseServerKey(process.env)
    : null

  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!preparedBinding && !anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  if (preparedBinding && !serverKey) {
    throw new Error(
      'Prepared legacy imports require SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY and never fall back to public signup.',
    )
  }

  const useServiceRole = Boolean(serverKey)
  const supabase = useServiceRole
    ? await createServiceRoleClient(supabaseUrl, serverKey)
    : null

  let profile
  let importClient = supabase
  let createdEmail = null
  let loginIdentifier = null

  if (useServiceRole) {
    if (preparedBinding) {
      profile = await requirePreparedLegacyProfile(supabase, preparedBinding)
    } else {
      const { data: foundProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', args.username)
        .maybeSingle()

      if (profileError) throw profileError
      if (!foundProfile) {
        throw new Error(`No profile found for ${args.username}. Run scripts/create-pathforge-seed-profile.mjs first.`)
      }

      profile = foundProfile
    }
  } else if (args.authMode === 'password') {
    const signedIn = await createPasswordSessionClient(supabaseUrl, anonKey, args)
    importClient = signedIn.supabase
    profile = signedIn.profile
    loginIdentifier = signedIn.loginIdentifier
  } else {
    const created = await createSyntheticSessionClient(supabaseUrl, anonKey, args)
    importClient = created.supabase
    profile = created.profile
    createdEmail = created.createdEmail
    loginIdentifier = created.createdEmail
  }

  const sourceRun = await insertSourceRunSubmission(
    importClient,
    pkg,
    profile,
    context,
    preparedBinding,
  )

  console.log(JSON.stringify(publicResult({
    sourceRunId: sourceRun.id,
    sourceRunStatus: sourceRun.status,
    pkg,
    profile,
    dryRun: false,
    loginIdentifier,
    preparedBinding,
    inserted: sourceRun.inserted ?? null,
  }), null, 2))

  if (createdEmail) {
    console.error(`Synthetic signup email used: ${createdEmail}`)
    console.error('Generated password was not stored or printed.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
