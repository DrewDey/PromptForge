import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { normalizeProjectForkSource, type ProjectForkSource } from './project-forks'

export type SourceRunPackageStep = {
  step_number: number
  prompt_exact: string
  response_exact: string
  artifact_version_path?: string | null
  artifact_sha256?: string
  generated_files?: string[]
}

export type SourceRunAccess = {
  mode: 'public_share' | 'authenticated_owner_session'
  public_share_unavailable?: boolean
  note?: string
}

export type SourceRunPackage = {
  title?: string
  model?: string
  model_settings?: string | Record<string, unknown>
  provider?: string
  source_url?: string
  source_access?: SourceRunAccess
  source_run_id?: string
  run_started_at?: string
  run_finished_at?: string
  prompt_count?: number
  repair_prompt_count?: number
  artifact_sha256?: string
  verification_notes?: string | string[]
  artifact_version_notes?: unknown[]
  source_inspiration_notes?: unknown[]
  final_artifact_path?: string
  pathforge_submission_url?: string
  pathforge_pending_id?: string
  source_run_submission_id?: string
  fork_source?: ProjectForkSource
  submitted_by_profile_registry_id?: string
  steps: SourceRunPackageStep[]
}

export type SourceRunIntakeForkEvidence = {
  source_project_id: string
  source_project_title: string | null
  source_model_variant_id: string | null
  source_run_id: string | null
  source_step_id: string | null
  source_step_number: number | null
  source_artifact_path: string | null
  source_artifact_sha256: string | null
  parent_fork_id: string | null
  prompt_family_id: string | null
  fork_depth: number
  fork_branch_index: number
}

export type SourceRunIntakeEvidence = {
  schema_version: 1
  provider: string
  model_used: string
  model_settings: string
  prompt_count: number
  final_artifact_path: string
  final_artifact_sha256: string
  profile_registry_id: string
  verification_notes: string[]
  artifact_version_notes: unknown[]
  source_inspiration_notes: unknown[]
  fork: SourceRunIntakeForkEvidence | null
}

export type SourceRunPackagePublicationEvidence = {
  sourceRunPackage: SourceRunPackage
  sourcePackageFile: string
  sourcePackageSha256: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new Error(`Source-run package field "${key}" must be a string.`)
  return value
}

function optionalPositiveInteger(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`Source-run package field "${key}" must be a positive integer.`)
  }
  return value
}

function optionalNonNegativeInteger(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`Source-run package field "${key}" must be a non-negative integer.`)
  }
  return value
}

function optionalStringList(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Source-run package field "${key}" must be an array of strings.`)
  }
  return value
}

function optionalStringOrStringList(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) return value
  throw new Error(`Source-run package field "${key}" must be a string or array of strings.`)
}

function optionalJsonArray(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value)) {
    throw new Error(`Source-run package field "${key}" must be an array.`)
  }
  return value
}

function optionalModelSettings(source: Record<string, unknown>) {
  const value = source.model_settings
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string' || isRecord(value)) return value
  throw new Error('Source-run package field "model_settings" must be a string or object.')
}

function optionalSourceRunAccess(source: Record<string, unknown>): SourceRunAccess | undefined {
  const value = source.source_access
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) {
    throw new Error('Source-run package field "source_access" must be an object.')
  }
  const mode = value.mode
  if (mode !== 'public_share' && mode !== 'authenticated_owner_session') {
    throw new Error('Source-run package source_access.mode must be public_share or authenticated_owner_session.')
  }
  const publicShareUnavailable = value.public_share_unavailable
  if (publicShareUnavailable !== undefined && typeof publicShareUnavailable !== 'boolean') {
    throw new Error('Source-run package source_access.public_share_unavailable must be a boolean.')
  }
  const note = value.note
  if (note !== undefined && (typeof note !== 'string' || !note.trim())) {
    throw new Error('Source-run package source_access.note must be a nonblank string.')
  }
  if (mode === 'authenticated_owner_session' && (publicShareUnavailable !== true || typeof note !== 'string')) {
    throw new Error('Authenticated owner-session evidence requires public_share_unavailable=true and a note.')
  }
  return {
    mode,
    public_share_unavailable: publicShareUnavailable,
    note: typeof note === 'string' ? note.trim() : undefined,
  }
}

function formatModelSettings(value: SourceRunPackage['model_settings']) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  return Object.entries(value)
    .map(([key, entry]) => {
      const text = typeof entry === 'string' ? entry.trim() : JSON.stringify(entry)
      return text ? `${key}: ${text}` : ''
    })
    .filter(Boolean)
    .join('; ')
}

function normalizedStringNotes(value: string | string[] | undefined) {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  return (value ?? []).map((entry) => entry.trim()).filter(Boolean)
}

function parseForkSource(value: unknown): ProjectForkSource | undefined {
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) throw new Error('Source-run package field "fork_source" must be an object.')

  const sourceProjectId = optionalString(value, 'source_project_id')
  if (!sourceProjectId) {
    throw new Error('Source-run package fork_source is missing source_project_id.')
  }

  const sourceStepNumber = value.source_step_number
  const sourceStepId = optionalString(value, 'source_step_id')
  if (!sourceStepId && (sourceStepNumber === undefined || sourceStepNumber === null)) {
    throw new Error('Source-run package fork_source needs source_step_id or source_step_number.')
  }
  const forkDepthValue = value.fork_depth ?? 0
  const forkBranchIndexValue = value.fork_branch_index ?? 0
  if (
    sourceStepNumber !== undefined && sourceStepNumber !== null &&
    (typeof sourceStepNumber !== 'number' || !Number.isInteger(sourceStepNumber) || sourceStepNumber < 1)
  ) {
    throw new Error('Source-run package fork_source.source_step_number must be a positive integer.')
  }
  for (const [field, entry] of [
    ['fork_depth', forkDepthValue],
    ['fork_branch_index', forkBranchIndexValue],
  ] as const) {
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0 || entry >= 10) {
      throw new Error(`Source-run package fork_source.${field} must be an integer from 0 through 9.`)
    }
  }

  const sourceRunId = optionalString(value, 'source_run_id')
  const sourceArtifactPath = optionalString(value, 'source_artifact_path')
  const sourceArtifactSha256 = optionalString(value, 'source_artifact_sha256')
  if (
    sourceRunId &&
    (
      !sourceStepId ||
      typeof sourceStepNumber !== 'number' ||
      !Number.isInteger(sourceStepNumber) ||
      sourceStepNumber < 1
    )
  ) {
    throw new Error(
      'Exact-run fork_source requires both an exact source_step_id and positive source_step_number.',
    )
  }
  if (
    sourceRunId &&
    sourceStepId !== `${sourceProjectId}:${sourceRunId}:step:${sourceStepNumber}`
  ) {
    throw new Error('Exact-run fork_source source_step_id does not match its project, run, and step number.')
  }
  if (
    sourceRunId &&
    (
      !sourceArtifactPath?.startsWith('public/artifacts/') ||
      sourceArtifactPath.includes('..') ||
      sourceArtifactPath.includes('\\') ||
      !sourceArtifactSha256 ||
      !/^[0-9a-f]{64}$/.test(sourceArtifactSha256)
    )
  ) {
    throw new Error(
      'Exact-run fork_source needs a public/artifacts source_artifact_path and 64-character source_artifact_sha256.',
    )
  }

  return {
    sourceProjectId,
    sourceProjectTitle: optionalString(value, 'source_project_title'),
    sourceModelVariantId: optionalString(value, 'source_model_variant_id'),
    sourceRunId,
    sourceStepId,
    sourceStepNumber: sourceStepNumber as number | undefined,
    sourceArtifactPath,
    sourceArtifactSha256: sourceArtifactSha256?.toLowerCase(),
    parentForkId: optionalString(value, 'parent_fork_id'),
    depth: forkDepthValue as number,
    branchIndex: forkBranchIndexValue as number,
    promptFamilyId: optionalString(value, 'prompt_family_id'),
  }
}

function parseStep(value: unknown, index: number): SourceRunPackageStep {
  if (!isRecord(value)) throw new Error(`Source-run package step ${index + 1} must be an object.`)

  const stepNumber = value.step_number
  if (typeof stepNumber !== 'number' || !Number.isInteger(stepNumber) || stepNumber < 1) {
    throw new Error(`Source-run package step ${index + 1} needs a positive integer "step_number".`)
  }

  const promptExact = value.prompt_exact
  if (typeof promptExact !== 'string') {
    throw new Error(`Source-run package step ${index + 1} is missing string "prompt_exact".`)
  }

  const responseExact = value.response_exact
  if (typeof responseExact !== 'string') {
    throw new Error(`Source-run package step ${index + 1} is missing string "response_exact".`)
  }

  return {
    step_number: stepNumber,
    prompt_exact: promptExact,
    response_exact: responseExact,
    artifact_version_path: optionalString(value, 'artifact_version_path') ?? null,
    artifact_sha256: optionalString(value, 'artifact_sha256'),
    generated_files: optionalStringList(value, 'generated_files'),
  }
}

function validateSequentialSteps(steps: SourceRunPackageStep[], fileName: string) {
  const seen = new Set<number>()
  for (let index = 0; index < steps.length; index += 1) {
    const stepNumber = steps[index].step_number
    if (seen.has(stepNumber)) {
      throw new Error(`Source-run package "${fileName}" repeats step_number ${stepNumber}.`)
    }
    seen.add(stepNumber)
    if (index > 0 && stepNumber !== steps[index - 1].step_number + 1) {
      throw new Error(
        `Source-run package "${fileName}" step identities must be positive, unique, and sequential.`,
      )
    }
  }
}

function packageLocation(fileName: string) {
  const normalizedFileName = fileName.replace(/\\/g, '/').replace(/^seed-runs\//, '')
  if (
    !normalizedFileName ||
    normalizedFileName.startsWith('/') ||
    normalizedFileName.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')
  ) {
    throw new Error(`Invalid source-run package path: ${fileName}`)
  }

  const root = path.resolve(process.cwd(), 'seed-runs')
  const absolutePath = path.resolve(root, normalizedFileName)
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Source-run package path escapes seed-runs: ${fileName}`)
  }

  return {
    absolutePath,
    relativeFileName: normalizedFileName,
    evidenceFileName: `seed-runs/${normalizedFileName}`,
    root,
  }
}

function listSourceRunPackageJsonFiles() {
  const seedRunsRoot = path.join(process.cwd(), 'seed-runs')
  const modelVariantsRoot = path.join(process.cwd(), 'seed-runs', 'model-variants')
  return [seedRunsRoot, modelVariantsRoot].flatMap((directory) => {
    if (!fs.existsSync(directory)) return []
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => (
      entry.isFile() && entry.name.endsWith('.json')
        ? [path.join(directory, entry.name)]
        : []
    ))
  })
}

function rawPackageRunId(value: unknown) {
  if (!isRecord(value)) return undefined
  const sourceRunId = value.source_run_id ?? value.source_run_submission_id
  return typeof sourceRunId === 'string' ? sourceRunId.trim() || undefined : undefined
}

export function findSourceRunPackageFileById(sourceRunId: string) {
  const normalizedRunId = sourceRunId.trim()
  if (!normalizedRunId) return undefined
  const { root } = packageLocation('placeholder.json')
  const matches = listSourceRunPackageJsonFiles().flatMap((candidatePath) => {
    try {
      const raw = JSON.parse(fs.readFileSync(candidatePath, 'utf8')) as unknown
      if (rawPackageRunId(raw) !== normalizedRunId) return []
      return [path.relative(root, candidatePath).split(path.sep).join('/')]
    } catch {
      return []
    }
  })

  if (matches.length > 1) {
    throw new Error(`Multiple source-run packages claim immutable run ${normalizedRunId}.`)
  }
  return matches[0]
}

function verifyArtifactDigest(artifactPath: string, expectedSha256: string) {
  const publicArtifactsRoot = path.resolve(process.cwd(), 'public/artifacts')
  const relativeArtifactPath = artifactPath.replace(/^public\/artifacts\//, '')
  const absoluteArtifactPath = path.resolve(publicArtifactsRoot, relativeArtifactPath)
  if (!absoluteArtifactPath.startsWith(`${publicArtifactsRoot}${path.sep}`)) {
    throw new Error('Variant-aware fork artifact must remain under public/artifacts.')
  }
  if (!fs.existsSync(absoluteArtifactPath)) {
    throw new Error(`Variant-aware fork artifact is missing: ${artifactPath}`)
  }
  const actualSha256 = createHash('sha256')
    .update(fs.readFileSync(absoluteArtifactPath))
    .digest('hex')
  if (actualSha256 !== expectedSha256.toLowerCase()) {
    throw new Error(`Variant-aware fork artifact digest does not match ${artifactPath}.`)
  }
}

function reconcileVariantAwareForkWithParentPackage(
  forkSource: ProjectForkSource | undefined,
  fileName: string,
) {
  if (!forkSource?.sourceRunId) return
  const sourceStepId = forkSource.sourceStepId
  const sourceStepNumber = forkSource.sourceStepNumber
  const sourceArtifactPath = forkSource.sourceArtifactPath
  const sourceArtifactSha256 = forkSource.sourceArtifactSha256
  if (!sourceStepId || !sourceStepNumber || !sourceArtifactPath || !sourceArtifactSha256) {
    throw new Error('Variant-aware fork source is incomplete after parsing.')
  }

  verifyArtifactDigest(sourceArtifactPath, sourceArtifactSha256)

  const parentFileName = findSourceRunPackageFileById(forkSource.sourceRunId)
  if (!parentFileName) return
  const current = packageLocation(fileName).relativeFileName
  if (parentFileName === current) {
    throw new Error('Variant-aware fork cannot use its own package as its parent run.')
  }

  const parentRaw = JSON.parse(
    fs.readFileSync(packageLocation(parentFileName).absolutePath, 'utf8'),
  ) as unknown
  if (!isRecord(parentRaw) || !Array.isArray(parentRaw.steps)) {
    throw new Error('Variant-aware fork parent package has no exact step evidence.')
  }
  const parentStep = parentRaw.steps.find((step) => (
    isRecord(step) && step.step_number === sourceStepNumber
  ))
  if (!isRecord(parentStep)) {
    throw new Error('Variant-aware fork source step does not exist in its parent package.')
  }
  if (parentStep.artifact_version_path !== sourceArtifactPath) {
    throw new Error('Variant-aware fork source artifact path does not match its parent package step.')
  }
  if (
    typeof parentStep.artifact_sha256 !== 'string' ||
    parentStep.artifact_sha256.toLowerCase() !== sourceArtifactSha256.toLowerCase()
  ) {
    throw new Error('Variant-aware fork source artifact digest does not match its parent package step.')
  }
}

export function canonicalSourceRunForkEvidence(
  source?: ProjectForkSource | null,
): SourceRunIntakeForkEvidence | null {
  if (!source?.sourceProjectId) return null
  const normalized = normalizeProjectForkSource(source)
  return {
    source_project_id: normalized.sourceProjectId.trim(),
    source_project_title: normalized.sourceProjectTitle ?? null,
    source_model_variant_id: normalized.sourceModelVariantId ?? null,
    source_run_id: normalized.sourceRunId ?? null,
    source_step_id: normalized.sourceStepId ?? null,
    source_step_number: normalized.sourceStepNumber ?? null,
    source_artifact_path: normalized.sourceArtifactPath ?? null,
    source_artifact_sha256: normalized.sourceArtifactSha256 ?? null,
    parent_fork_id: normalized.parentForkId ?? null,
    prompt_family_id: normalized.promptFamilyId ?? null,
    fork_depth: normalized.depth,
    fork_branch_index: normalized.branchIndex,
  }
}

export function canonicalizeSourceRunUrl(value: string) {
  const parsed = new URL(value.trim())
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Prepared source-run URL must use http or https.')
  }
  parsed.hash = ''
  if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  return parsed.toString()
}

export function buildSourceRunIntakeEvidence(input: {
  sourceRunPackage: SourceRunPackage
  forkSource?: ProjectForkSource | null
}): SourceRunIntakeEvidence {
  const provider = input.sourceRunPackage.provider?.trim()
  const model = input.sourceRunPackage.model?.trim()
  const promptCount = input.sourceRunPackage.prompt_count ?? input.sourceRunPackage.steps.length
  const finalArtifactPath = input.sourceRunPackage.final_artifact_path?.trim()
  const finalArtifactSha256 = input.sourceRunPackage.artifact_sha256?.trim().toLowerCase()
  const profileRegistryId = input.sourceRunPackage.submitted_by_profile_registry_id?.trim()
  if (!provider || !model) {
    throw new Error('Prepared source-run evidence requires provider and exact model.')
  }
  if (!Number.isInteger(promptCount) || promptCount < 1) {
    throw new Error('Prepared source-run evidence requires a positive prompt count.')
  }
  if (
    !finalArtifactPath?.startsWith('public/artifacts/') ||
    finalArtifactPath.includes('..') ||
    finalArtifactPath.includes('\\')
  ) {
    throw new Error('Prepared source-run evidence requires a safe final artifact path.')
  }
  if (!finalArtifactSha256 || !/^[0-9a-f]{64}$/.test(finalArtifactSha256)) {
    throw new Error('Prepared source-run evidence requires a lowercase final artifact SHA-256.')
  }
  if (!profileRegistryId) {
    throw new Error('Prepared source-run evidence requires a profile registry id.')
  }

  return {
    schema_version: 1,
    provider,
    model_used: model,
    model_settings: formatModelSettings(input.sourceRunPackage.model_settings),
    prompt_count: promptCount,
    final_artifact_path: finalArtifactPath,
    final_artifact_sha256: finalArtifactSha256,
    profile_registry_id: profileRegistryId,
    verification_notes: normalizedStringNotes(input.sourceRunPackage.verification_notes),
    artifact_version_notes: input.sourceRunPackage.artifact_version_notes ?? [],
    source_inspiration_notes: input.sourceRunPackage.source_inspiration_notes ?? [],
    fork: canonicalSourceRunForkEvidence(input.forkSource ?? input.sourceRunPackage.fork_source),
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

export function sourceRunEvidenceEquals(left: unknown, right: unknown) {
  return stableJson(left) === stableJson(right)
}

function parseSourceRunPackage(value: unknown, fileName: string): SourceRunPackage {
  if (!isRecord(value)) throw new Error(`Source-run package "${fileName}" must contain a JSON object.`)

  const steps = value.steps
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(`Source-run package "${fileName}" must contain at least one step.`)
  }

  const parsedSteps = steps.map(parseStep)
  validateSequentialSteps(parsedSteps, fileName)
  const promptCount = optionalPositiveInteger(value, 'prompt_count')
  if (promptCount !== undefined && promptCount !== parsedSteps.length) {
    throw new Error(
      `Source-run package "${fileName}" prompt_count must equal its exact step evidence count.`,
    )
  }
  const forkSource = parseForkSource(value.fork_source)
  reconcileVariantAwareForkWithParentPackage(forkSource, fileName)

  return {
    title: optionalString(value, 'title'),
    model: optionalString(value, 'model'),
    model_settings: optionalModelSettings(value),
    provider: optionalString(value, 'provider'),
    source_url: optionalString(value, 'source_url'),
    source_access: optionalSourceRunAccess(value),
    source_run_id: optionalString(value, 'source_run_id'),
    run_started_at: optionalString(value, 'run_started_at'),
    run_finished_at: optionalString(value, 'run_finished_at'),
    prompt_count: promptCount,
    repair_prompt_count: optionalNonNegativeInteger(value, 'repair_prompt_count'),
    artifact_sha256: optionalString(value, 'artifact_sha256'),
    verification_notes: optionalStringOrStringList(value, 'verification_notes'),
    artifact_version_notes: optionalJsonArray(value, 'artifact_version_notes'),
    source_inspiration_notes: optionalJsonArray(value, 'source_inspiration_notes'),
    final_artifact_path: optionalString(value, 'final_artifact_path'),
    pathforge_submission_url: optionalString(value, 'pathforge_submission_url'),
    pathforge_pending_id: optionalString(value, 'pathforge_pending_id'),
    source_run_submission_id: optionalString(value, 'source_run_submission_id'),
    fork_source: forkSource,
    submitted_by_profile_registry_id: optionalString(value, 'submitted_by_profile_registry_id'),
    steps: parsedSteps,
  }
}

export function loadSourceRunPackage(fileName: string): SourceRunPackage {
  const location = packageLocation(fileName)
  const rawPackage = JSON.parse(
    fs.readFileSync(location.absolutePath, 'utf8')
  ) as unknown

  return parseSourceRunPackage(rawPackage, location.relativeFileName)
}

export function loadSourceRunPackagePublicationEvidence(
  fileName: string,
): SourceRunPackagePublicationEvidence {
  const location = packageLocation(fileName)
  const packageBytes = fs.readFileSync(location.absolutePath)
  const rawPackage = JSON.parse(packageBytes.toString('utf8')) as unknown
  return {
    sourceRunPackage: parseSourceRunPackage(rawPackage, location.relativeFileName),
    sourcePackageFile: location.evidenceFileName,
    sourcePackageSha256: createHash('sha256').update(packageBytes).digest('hex'),
  }
}
