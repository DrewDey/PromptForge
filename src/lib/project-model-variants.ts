import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import airlockZeroReactorRunVariantSet from '../../seed-runs/model-variants/airlock-zero-reactor-run.json'
import bookingFlowHandoffSimulatorVariantSet from '../../seed-runs/model-variants/booking-flow-handoff-simulator.json'
import sleepSoundMixerVariantSet from '../../seed-runs/model-variants/calming-sleep-sound-mixer.json'
import firstPrinciplesClaimLadderVariantSet from '../../seed-runs/model-variants/first-principles-claim-ladder-game.json'
import gymMirrorProgressShotVariantSet from '../../seed-runs/model-variants/gym-mirror-progress-shot-consistency-studio.json'
import rentalWalkthroughScorecardVariantSet from '../../seed-runs/model-variants/rental-walkthrough-red-flag-scorecard.json'
import securityCamAnomalyTimelineVariantSet from '../../seed-runs/model-variants/security-cam-anomaly-timeline-game.json'
import tShirtPrintAlignmentVariantSet from '../../seed-runs/model-variants/t-shirt-print-alignment-press-game.json'
import tinyFestivalSetTimeClashVariantSet from '../../seed-runs/model-variants/tiny-festival-set-time-clash-game.json'
import {
  assertProjectModelVariantOrigin,
  resolveProjectModelVariantOriginMode,
} from './project-model-variant-origin.mjs'
import { loadSourceRunPackage, type SourceRunPackage } from './source-run-package'
import type { ProjectModelVariantPublicRecord } from './types'

export type ProjectModelProviderKey = 'openai' | 'anthropic' | 'google'
export type ProjectModelVariantOperatorKind =
  | 'original-author'
  | 'pathforge-labs-manual'
  | 'pathforge-labs-automation'
export type ProjectModelVariantQualityStatus = 'verified' | 'known-issue'
export type ProjectModelVariantOriginMode = 'existing-project' | 'model-cohort'

const PROVIDER_KEYS = ['openai', 'anthropic', 'google'] as const
const OPERATOR_KINDS = [
  'original-author',
  'pathforge-labs-manual',
  'pathforge-labs-automation',
] as const
const RUN_ROLES = ['historical-baseline', 'comparison-run'] as const
const QUALITY_STATUSES = ['verified', 'known-issue'] as const

export type ProjectModelVariantMetrics = {
  qualityScore: number
  artifactReady: boolean
  hardGatesPassed: boolean
  functionalChecks: {
    passed: number
    total: number
  }
  consoleErrorCount: number
  horizontalOverflowPx: number
  notes: string[]
}

export type ProjectModelVariantContract = {
  version: string
  sha256: string
  openingPromptExact: string
  openingPromptSha256: string
  acceptanceCriteria: string[]
  adaptiveRepairPolicy: string
}

export type ProjectModelVariant = {
  /** Live immutable registry row id when the checked manifest has been reconciled to Supabase. */
  databaseId?: string
  sourceRunId: string
  providerKey: ProjectModelProviderKey
  serviceLabel: string
  modelLabel: string
  modelSettings: string
  operatorKind: ProjectModelVariantOperatorKind
  operatorLabel: string
  runRole: 'historical-baseline' | 'comparison-run'
  qualityStatus: ProjectModelVariantQualityStatus
  isCurrent: boolean
  supersedesSourceRunId?: string
  capturedAt: string
  promptCount: number
  repairPromptCount: number
  verificationEvidenceFile?: string
  packageFile: string
  packageSha256: string
  firstArtifactPath: string
  finalArtifactPath: string
  artifactVersionPaths: string[]
  firstPassMetrics: ProjectModelVariantMetrics
  finalMetrics: ProjectModelVariantMetrics
  sourceRunPackage: SourceRunPackage
}

export type ProjectModelVariantSet = {
  schemaVersion: 1
  originMode: ProjectModelVariantOriginMode
  canonicalProjectId: string
  canonicalRoute: string
  title: string
  defaultSourceRunId: string
  contract: ProjectModelVariantContract
  variants: ProjectModelVariant[]
}

type RawProjectModelVariant = Omit<ProjectModelVariant, 'sourceRunPackage'>

type RawProjectModelVariantSet = Omit<ProjectModelVariantSet, 'originMode' | 'variants'> & {
  /** Launch manifests predate this field and normalize to existing-project. */
  originMode?: ProjectModelVariantOriginMode
  variants: RawProjectModelVariant[]
}

const RAW_VARIANT_SETS = [
  sleepSoundMixerVariantSet,
  bookingFlowHandoffSimulatorVariantSet,
  firstPrinciplesClaimLadderVariantSet,
  tinyFestivalSetTimeClashVariantSet,
  rentalWalkthroughScorecardVariantSet,
  gymMirrorProgressShotVariantSet,
  securityCamAnomalyTimelineVariantSet,
  tShirtPrintAlignmentVariantSet,
] as unknown as RawProjectModelVariantSet[]

if (RAW_VARIANT_SETS.length !== 8) {
  throw new Error('The model-variant runtime registry must contain all eight launch projects.')
}

// Post-launch manifests belong here instead of in RAW_VARIANT_SETS. Keeping
// this registry separate makes the immutable eight-project launch snapshot
// auditable while allowing explicitly-originated cohorts to join the runtime.
const ACTIVE_ADDITIONAL_VARIANT_SETS = [
  airlockZeroReactorRunVariantSet,
] as unknown as RawProjectModelVariantSet[]

for (const variantSet of ACTIVE_ADDITIONAL_VARIANT_SETS) {
  if (variantSet.originMode === undefined) {
    throw new Error(
      `Post-launch model-variant set ${variantSet.canonicalProjectId} must declare originMode.`,
    )
  }
}

const ALL_RAW_VARIANT_SETS = [
  ...RAW_VARIANT_SETS,
  ...ACTIVE_ADDITIONAL_VARIANT_SETS,
]

function assertNonEmpty(value: string, field: string) {
  if (!value.trim()) throw new Error(`Model-variant field "${field}" cannot be blank.`)
}

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

const PUBLIC_SOURCE_PATHS: Record<ProjectModelProviderKey, RegExp> = {
  openai: /^https:\/\/chatgpt\.com\/(?:share|s)\//,
  anthropic: /^https:\/\/claude\.ai\/share\//,
  google: /^https:\/\/share\.gemini\.google\//,
}

function assertModelVariantSourceAccess(
  variant: RawProjectModelVariant,
  sourceRunPackage: SourceRunPackage,
) {
  const sourceUrl = sourceRunPackage.source_url ?? ''
  if (PUBLIC_SOURCE_PATHS[variant.providerKey].test(sourceUrl)) {
    if (sourceRunPackage.source_access?.mode === 'authenticated_owner_session') {
      throw new Error(`Model variant ${variant.sourceRunId} public source cannot be labeled owner-only.`)
    }
    return
  }

  const ownerSessionFallback =
    variant.providerKey === 'anthropic' &&
    /^https:\/\/claude\.ai\/chat\/[0-9a-f-]+$/i.test(sourceUrl) &&
    sourceRunPackage.source_access?.mode === 'authenticated_owner_session' &&
    sourceRunPackage.source_access.public_share_unavailable === true &&
    Boolean(sourceRunPackage.source_access.note?.trim())

  if (!ownerSessionFallback) {
    throw new Error(
      `Model variant ${variant.sourceRunId} needs a public provider share URL or an explicit Claude owner-session fallback.`,
    )
  }
}

function seedRunPath(fileName: string) {
  const normalizedFileName = fileName.replace(/\\/g, '/').replace(/^seed-runs\//, '')
  if (
    !normalizedFileName ||
    normalizedFileName.startsWith('/') ||
    normalizedFileName.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')
  ) {
    throw new Error(`Invalid model-variant package path: ${fileName}`)
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    'seed-runs',
    normalizedFileName,
  )
}

function resolveArtifactPath(fileName: string) {
  const relativePath = fileName.replace(/^public\/artifacts\//, '')
  if (
    !relativePath ||
    relativePath.startsWith('/') ||
    relativePath.includes('\\') ||
    relativePath.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')
  ) {
    throw new Error(`Invalid model-variant artifact path: ${fileName}`)
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    'public',
    'artifacts',
    relativePath,
  )
}

function validateMetrics(
  metrics: unknown,
  field: string,
): asserts metrics is ProjectModelVariantMetrics {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
    throw new Error(`${field} must be an object.`)
  }

  const value = metrics as Partial<ProjectModelVariantMetrics>
  if (
    typeof value.qualityScore !== 'number' ||
    !Number.isFinite(value.qualityScore) ||
    value.qualityScore < 0 ||
    value.qualityScore > 100
  ) {
    throw new Error(`${field}.qualityScore must be between 0 and 100.`)
  }
  if (typeof value.artifactReady !== 'boolean') {
    throw new Error(`${field}.artifactReady must be a boolean.`)
  }
  if (typeof value.hardGatesPassed !== 'boolean') {
    throw new Error(`${field}.hardGatesPassed must be a boolean.`)
  }
  if (
    !value.functionalChecks ||
    typeof value.functionalChecks !== 'object' ||
    Array.isArray(value.functionalChecks)
  ) {
    throw new Error(`${field}.functionalChecks must be an object.`)
  }
  if (
    typeof value.functionalChecks.passed !== 'number' ||
    typeof value.functionalChecks.total !== 'number' ||
    !Number.isInteger(value.functionalChecks.passed) ||
    !Number.isInteger(value.functionalChecks.total) ||
    value.functionalChecks.passed < 0 ||
    value.functionalChecks.total < 1 ||
    value.functionalChecks.passed > value.functionalChecks.total
  ) {
    throw new Error(`${field}.functionalChecks is invalid.`)
  }
  if (
    typeof value.consoleErrorCount !== 'number' ||
    !Number.isInteger(value.consoleErrorCount) ||
    value.consoleErrorCount < 0
  ) {
    throw new Error(`${field}.consoleErrorCount must be a non-negative integer.`)
  }
  if (
    typeof value.horizontalOverflowPx !== 'number' ||
    !Number.isFinite(value.horizontalOverflowPx) ||
    value.horizontalOverflowPx < 0
  ) {
    throw new Error(`${field}.horizontalOverflowPx must be non-negative.`)
  }
  if (
    !Array.isArray(value.notes) ||
    value.notes.length < 1 ||
    !value.notes.every((note) => typeof note === 'string' && note.trim().length > 0)
  ) {
    throw new Error(`${field}.notes must contain nonblank verification evidence.`)
  }
}

export function getProjectModelVariantKnownIssueExplanation(
  variant: Pick<
    ProjectModelVariant,
    'sourceRunId' | 'qualityStatus' | 'repairPromptCount' | 'firstPassMetrics' | 'finalMetrics'
  >,
) {
  if (variant.qualityStatus !== 'known-issue') return null

  // With no repair prompts, the first-pass finding is also the final defect and
  // is usually the most precise description. Repaired runs must use final-state
  // evidence so already-fixed first-pass defects are never presented as current.
  const issueMetrics = variant.repairPromptCount === 0
    ? variant.firstPassMetrics
    : variant.finalMetrics
  const explanation = issueMetrics.notes
    .map((note) => note.trim())
    .filter(Boolean)
    .join(' ')

  if (!explanation) {
    throw new Error(
      `Known-issue model variant ${variant.sourceRunId} needs a user-facing explanation.`,
    )
  }

  return explanation
}

function prepareVariantSet(rawSet: RawProjectModelVariantSet): ProjectModelVariantSet {
  if (rawSet.schemaVersion !== 1) {
    throw new Error(`Unsupported model-variant schema version: ${rawSet.schemaVersion}.`)
  }
  assertNonEmpty(rawSet.canonicalProjectId, 'canonicalProjectId')
  assertNonEmpty(rawSet.canonicalRoute, 'canonicalRoute')
  const originMode = resolveProjectModelVariantOriginMode(rawSet.originMode)
  assertNonEmpty(rawSet.contract.openingPromptExact, 'contract.openingPromptExact')
  if (rawSet.contract.acceptanceCriteria.length < 1) {
    throw new Error(`Model-variant set ${rawSet.canonicalProjectId} needs acceptance criteria.`)
  }
  if (sha256(rawSet.contract.openingPromptExact) !== rawSet.contract.openingPromptSha256) {
    throw new Error(`Model-variant set ${rawSet.canonicalProjectId} has an invalid opening-prompt hash.`)
  }
  const contractPayload = {
    version: rawSet.contract.version,
    openingPromptExact: rawSet.contract.openingPromptExact,
    acceptanceCriteria: rawSet.contract.acceptanceCriteria,
    adaptiveRepairPolicy: rawSet.contract.adaptiveRepairPolicy,
  }
  if (sha256(JSON.stringify(contractPayload)) !== rawSet.contract.sha256) {
    throw new Error(`Model-variant set ${rawSet.canonicalProjectId} has an invalid contract hash.`)
  }

  const sourceRunIds = new Set<string>()
  const providerKeys = new Set<ProjectModelProviderKey>()
  let defaultCount = 0

  const variants = rawSet.variants.map((variant) => {
    assertNonEmpty(variant.sourceRunId, 'variant.sourceRunId')
    assertNonEmpty(variant.modelLabel, 'variant.modelLabel')
    assertNonEmpty(variant.packageFile, 'variant.packageFile')
    if (Number.isNaN(Date.parse(variant.capturedAt))) {
      throw new Error(`Invalid capture date for model variant ${variant.sourceRunId}.`)
    }
    if (sourceRunIds.has(variant.sourceRunId)) {
      throw new Error(`Duplicate model-variant source run: ${variant.sourceRunId}.`)
    }
    sourceRunIds.add(variant.sourceRunId)
    if (!PROVIDER_KEYS.includes(variant.providerKey)) {
      throw new Error(`Invalid provider for model variant ${variant.sourceRunId}.`)
    }
    if (!OPERATOR_KINDS.includes(variant.operatorKind)) {
      throw new Error(`Invalid operator kind for model variant ${variant.sourceRunId}.`)
    }
    if (!RUN_ROLES.includes(variant.runRole)) {
      throw new Error(`Invalid run role for model variant ${variant.sourceRunId}.`)
    }
    if (!QUALITY_STATUSES.includes(variant.qualityStatus)) {
      throw new Error(`Invalid quality status for model variant ${variant.sourceRunId}.`)
    }
    providerKeys.add(variant.providerKey)
    if (variant.sourceRunId === rawSet.defaultSourceRunId) defaultCount += 1
    if (variant.promptCount < 1 || variant.repairPromptCount < 0 || variant.repairPromptCount >= variant.promptCount) {
      throw new Error(`Invalid prompt counts for model variant ${variant.sourceRunId}.`)
    }
    validateMetrics(variant.firstPassMetrics, `${variant.sourceRunId}.firstPassMetrics`)
    validateMetrics(variant.finalMetrics, `${variant.sourceRunId}.finalMetrics`)
    getProjectModelVariantKnownIssueExplanation(variant)
    if (
      variant.qualityStatus === 'verified' &&
      (
        variant.finalMetrics.qualityScore < 90 ||
        !variant.finalMetrics.artifactReady ||
        !variant.finalMetrics.hardGatesPassed ||
        variant.finalMetrics.functionalChecks.passed !== variant.finalMetrics.functionalChecks.total ||
        variant.finalMetrics.consoleErrorCount !== 0 ||
        variant.finalMetrics.horizontalOverflowPx !== 0
      )
    ) {
      throw new Error(`Verified model variant ${variant.sourceRunId} does not meet the A+ release bar.`)
    }
    if (typeof variant.isCurrent !== 'boolean') {
      throw new Error(`Model variant ${variant.sourceRunId} must declare isCurrent.`)
    }
    if (variant.runRole === 'historical-baseline' && variant.isCurrent) {
      throw new Error(`Historical model variant ${variant.sourceRunId} cannot be current.`)
    }
    if (
      variant.artifactVersionPaths.length < 1 ||
      new Set(variant.artifactVersionPaths).size !== variant.artifactVersionPaths.length ||
      !variant.artifactVersionPaths.includes(variant.firstArtifactPath) ||
      !variant.artifactVersionPaths.includes(variant.finalArtifactPath)
    ) {
      throw new Error(`Model variant ${variant.sourceRunId} has an invalid artifact-version set.`)
    }

    const sourceRunPackage = loadSourceRunPackage(variant.packageFile)
    if (sha256(readFileSync(/* turbopackIgnore: true */ seedRunPath(variant.packageFile))) !== variant.packageSha256) {
      throw new Error(`Model variant ${variant.sourceRunId} package hash does not match.`)
    }
    const firstPrompt = sourceRunPackage.steps[0]?.prompt_exact
    if (firstPrompt !== rawSet.contract.openingPromptExact) {
      throw new Error(`Model variant ${variant.sourceRunId} does not use the invariant opening prompt.`)
    }
    if (sourceRunPackage.steps.length !== variant.promptCount) {
      throw new Error(`Model variant ${variant.sourceRunId} prompt count does not match its package.`)
    }
    if (sourceRunPackage.prompt_count && sourceRunPackage.prompt_count !== variant.promptCount) {
      throw new Error(`Model variant ${variant.sourceRunId} package prompt_count does not match.`)
    }
    const packageSourceRunId =
      sourceRunPackage.source_run_id ??
      sourceRunPackage.pathforge_pending_id ??
      sourceRunPackage.source_run_submission_id
    if (packageSourceRunId && packageSourceRunId !== variant.sourceRunId) {
      throw new Error(`Model variant ${variant.sourceRunId} package source_run_id does not match.`)
    }
    if (sourceRunPackage.provider !== variant.serviceLabel) {
      throw new Error(`Model variant ${variant.sourceRunId} provider does not match its package.`)
    }
    if (sourceRunPackage.model !== variant.modelLabel) {
      throw new Error(`Model variant ${variant.sourceRunId} model label does not match its package.`)
    }
    if (sourceRunPackage.model_settings !== variant.modelSettings) {
      throw new Error(`Model variant ${variant.sourceRunId} settings do not match its package.`)
    }
    if (sourceRunPackage.run_finished_at !== variant.capturedAt) {
      throw new Error(`Model variant ${variant.sourceRunId} capture time does not match its package.`)
    }
    if (!sourceRunPackage.source_url?.startsWith('https://')) {
      throw new Error(`Model variant ${variant.sourceRunId} needs a public HTTPS source URL.`)
    }
    assertModelVariantSourceAccess(variant, sourceRunPackage)
    if (sourceRunPackage.final_artifact_path !== variant.finalArtifactPath) {
      throw new Error(`Model variant ${variant.sourceRunId} final artifact does not match its package.`)
    }
    if (
      !sourceRunPackage.artifact_sha256 ||
      sha256(readFileSync(/* turbopackIgnore: true */ resolveArtifactPath(variant.finalArtifactPath))) !== sourceRunPackage.artifact_sha256
    ) {
      throw new Error(`Model variant ${variant.sourceRunId} final artifact hash does not match.`)
    }
    for (const artifactPath of variant.artifactVersionPaths) {
      if (!artifactPath.startsWith('public/artifacts/')) {
        throw new Error(`Model variant ${variant.sourceRunId} has an invalid artifact path.`)
      }
      readFileSync(/* turbopackIgnore: true */ resolveArtifactPath(artifactPath))
    }

    return { ...variant, sourceRunPackage }
  })

  if (defaultCount !== 1) {
    throw new Error(`Model-variant set ${rawSet.canonicalProjectId} must have exactly one default run.`)
  }

  if (variants.length < 3 || providerKeys.size !== 3) {
    throw new Error(
      `Model-variant set ${rawSet.canonicalProjectId} must contain at least one OpenAI, Anthropic, and Google run.`,
    )
  }

  assertProjectModelVariantOrigin({
    canonicalProjectId: rawSet.canonicalProjectId,
    originMode,
    variants,
  })

  for (const providerKey of providerKeys) {
    const providerHistory = variants
      .filter((variant) => variant.providerKey === providerKey)
      .sort((left, right) => (
        Date.parse(left.capturedAt) - Date.parse(right.capturedAt) ||
        left.sourceRunId.localeCompare(right.sourceRunId)
      ))
    if (providerHistory.length < 1) {
      throw new Error(
        `Model-variant set ${rawSet.canonicalProjectId} has no ${providerKey} history.`,
      )
    }
    const currentReleases = providerHistory.filter((variant) => variant.isCurrent)
    const historicalOnly =
      providerHistory.length === 1 && providerHistory[0].runRole === 'historical-baseline'
    if (
      historicalOnly
        ? currentReleases.length !== 0
        : (
            currentReleases.length !== 1 ||
            currentReleases[0].sourceRunId !== providerHistory.at(-1)?.sourceRunId
          )
    ) {
      throw new Error(
        `Model-variant set ${rawSet.canonicalProjectId} must mark only the latest ${providerKey} release as current.`,
      )
    }
    for (const [index, variant] of providerHistory.entries()) {
      const expectedSupersedesSourceRunId = index === 0
        ? undefined
        : providerHistory[index - 1].sourceRunId
      if (variant.supersedesSourceRunId !== expectedSupersedesSourceRunId) {
        throw new Error(
          `Model variant ${variant.sourceRunId} must supersede the immediately prior ${providerKey} release.`,
        )
      }
      if (
        index > 0 &&
        Date.parse(variant.capturedAt) <= Date.parse(providerHistory[index - 1].capturedAt)
      ) {
        throw new Error(
          `Model variant ${variant.sourceRunId} must finish after the ${providerKey} release it supersedes.`,
        )
      }
    }
  }

  const defaultVariant = variants.find((variant) => variant.sourceRunId === rawSet.defaultSourceRunId)
  if (
    !defaultVariant ||
    defaultVariant.runRole !== 'comparison-run' ||
    !defaultVariant.isCurrent ||
    defaultVariant.qualityStatus !== 'verified' ||
    !defaultVariant.finalMetrics.hardGatesPassed
  ) {
    throw new Error(
      `Model-variant set ${rawSet.canonicalProjectId} must default to a verified comparison run.`,
    )
  }

  return { ...rawSet, originMode, variants }
}

function validateRawVariantSets(variantSets: RawProjectModelVariantSet[]) {
  const projectIds = new Set<string>()
  const routes = new Set<string>()
  const sourceRunIds = new Set<string>()
  const packageFiles = new Set<string>()
  const artifactOwners = new Map<string, string>()

  for (const variantSet of variantSets) {
    if (projectIds.has(variantSet.canonicalProjectId)) {
      throw new Error(`Duplicate model-variant project: ${variantSet.canonicalProjectId}.`)
    }
    if (routes.has(variantSet.canonicalRoute)) {
      throw new Error(`Duplicate model-variant route: ${variantSet.canonicalRoute}.`)
    }
    projectIds.add(variantSet.canonicalProjectId)
    routes.add(variantSet.canonicalRoute)

    for (const variant of variantSet.variants) {
      if (sourceRunIds.has(variant.sourceRunId)) {
        throw new Error(`Model-variant source run is reused across projects: ${variant.sourceRunId}.`)
      }
      if (packageFiles.has(variant.packageFile)) {
        throw new Error(`Model-variant package is reused across projects: ${variant.packageFile}.`)
      }
      sourceRunIds.add(variant.sourceRunId)
      packageFiles.add(variant.packageFile)

      for (const artifactPath of variant.artifactVersionPaths) {
        const owner = artifactOwners.get(artifactPath)
        if (owner && owner !== variant.sourceRunId) {
          throw new Error(`Model-variant artifact ${artifactPath} is shared by ${owner} and ${variant.sourceRunId}.`)
        }
        artifactOwners.set(artifactPath, variant.sourceRunId)
      }
    }
  }
}

// Keep global ownership checks cheap and deterministic at module load. Package
// and artifact reads happen only when a route asks for its project below.
validateRawVariantSets(ALL_RAW_VARIANT_SETS)

const RAW_VARIANT_SETS_BY_PROJECT_ID = new Map(
  ALL_RAW_VARIANT_SETS.map((variantSet) => [variantSet.canonicalProjectId, variantSet]),
)
const PREPARED_VARIANT_SET_CACHE = new Map<string, ProjectModelVariantSet>()

function expectedDatabaseModelSettings(variant: ProjectModelVariant) {
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

function modelReleaseKey(modelLabel: string) {
  return modelLabel
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJson)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableJson(entry)]),
    )
  }
  return value
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right))
}

export function getProjectModelVariantSet(projectId: string) {
  const cached = PREPARED_VARIANT_SET_CACHE.get(projectId)
  if (cached) return cached

  const rawSet = RAW_VARIANT_SETS_BY_PROJECT_ID.get(projectId)
  if (!rawSet) return null

  const prepared = prepareVariantSet(rawSet)
  PREPARED_VARIANT_SET_CACHE.set(projectId, prepared)
  return prepared
}

export function getProjectModelVariantArtifactPublicationEntries() {
  return ALL_RAW_VARIANT_SETS.flatMap((variantSet) => (
    variantSet.variants.flatMap((variant) => (
      [...new Set([
        variant.firstArtifactPath,
        variant.finalArtifactPath,
        ...variant.artifactVersionPaths,
      ])].map((artifactPath) => ({
        projectId: variantSet.canonicalProjectId,
        artifactPath,
      }))
    ))
  ))
}

export function reconcileProjectModelVariantSet(
  variantSet: ProjectModelVariantSet,
  records: ProjectModelVariantPublicRecord[] | null,
): ProjectModelVariantSet {
  if (records === null) return variantSet

  if (records.length === 0) {
    throw new Error(
      `Published model-variant records for ${variantSet.canonicalProjectId} are missing from the configured database.`,
    )
  }

  if (records.length < variantSet.variants.length) {
    throw new Error(
      `Published model-variant records for ${variantSet.canonicalProjectId} are incomplete: expected ${variantSet.variants.length}, received ${records.length}.`,
    )
  }

  const recordsBySourceRunId = new Map(records.map((record) => [record.source_run_id, record]))
  const deployedSourceRunIds = new Set(
    variantSet.variants.map((variant) => variant.sourceRunId),
  )
  const undeployedDatabaseHistory = records.filter(
    (record) => !deployedSourceRunIds.has(record.source_run_id),
  )
  for (const record of undeployedDatabaseHistory) {
    if (
      record.project_id !== variantSet.canonicalProjectId ||
      !['published', 'historical'].includes(record.status)
    ) {
      throw new Error(
        `Undeployed model-variant record ${record.source_run_id} is outside the canonical public history.`,
      )
    }
  }
  const variants = variantSet.variants.map((variant) => {
    const record = recordsBySourceRunId.get(variant.sourceRunId)
    if (!record) {
      throw new Error(
        `Published model-variant record ${variant.sourceRunId} is missing from the configured database.`,
      )
    }
    const expectedOperatorKind = variant.operatorKind.replaceAll('-', '_')
    const expectedRunRole = variant.runRole.replaceAll('-', '_')
    const expectedQualityStatus = variant.qualityStatus.replaceAll('-', '_')
    const expectedStatus = variant.runRole === 'historical-baseline' ? 'historical' : 'published'
    const expectedSupersedesVariantId = variant.supersedesSourceRunId
      ? recordsBySourceRunId.get(variant.supersedesSourceRunId)?.id ?? null
      : null
    const currentStateMatches = record.is_current === variant.isCurrent || (
      variant.isCurrent &&
      !record.is_current &&
      undeployedDatabaseHistory.some((futureRecord) => (
        futureRecord.provider_key === variant.providerKey &&
        futureRecord.status === 'published' &&
        futureRecord.is_current
      ))
    )
    if (
      record.project_id !== variantSet.canonicalProjectId ||
      record.provider_key !== variant.providerKey ||
      record.service_label !== variant.serviceLabel ||
      record.model_release_key !== modelReleaseKey(variant.modelLabel) ||
      record.model_label !== variant.modelLabel ||
      !sameJson(record.model_settings, expectedDatabaseModelSettings(variant)) ||
      record.source_url !== variant.sourceRunPackage.source_url ||
      record.source_package_file !== `seed-runs/${variant.packageFile}` ||
      record.source_package_sha256 !== variant.packageSha256 ||
      record.opening_prompt_sha256 !== variantSet.contract.openingPromptSha256 ||
      record.comparison_contract_version !== variantSet.contract.version ||
      record.comparison_contract_sha256 !== variantSet.contract.sha256 ||
      record.operator_kind !== expectedOperatorKind ||
      record.operator_label !== variant.operatorLabel ||
      record.run_role !== expectedRunRole ||
      record.quality_status !== expectedQualityStatus ||
      !record.run_finished_at ||
      Date.parse(record.run_finished_at) !== Date.parse(variant.capturedAt) ||
      (
        variant.sourceRunPackage.run_started_at &&
        (
          !record.run_started_at ||
          Date.parse(record.run_started_at) !== Date.parse(variant.sourceRunPackage.run_started_at)
        )
      ) ||
      record.repair_prompt_count !== variant.repairPromptCount ||
      record.first_artifact_path !== variant.firstArtifactPath ||
      record.final_artifact_path !== variant.finalArtifactPath ||
      record.prompt_count !== variant.promptCount ||
      record.status !== expectedStatus ||
      !currentStateMatches ||
      record.supersedes_variant_id !== expectedSupersedesVariantId ||
      !sameJson(record.first_pass_metrics, variant.firstPassMetrics) ||
      !sameJson(record.final_metrics, variant.finalMetrics) ||
      JSON.stringify([...record.artifact_version_paths].sort()) !==
        JSON.stringify([...variant.artifactVersionPaths].sort())
    ) {
      throw new Error(`Published model-variant record ${record.source_run_id} does not match its release payload.`)
    }
    return { ...variant, databaseId: record.id }
  })

  const databaseDefaults = records.filter((record) => record.is_default)
  if (databaseDefaults.length !== 1) {
    throw new Error(
      `Published model-variant records for ${variantSet.canonicalProjectId} need exactly one default.`,
    )
  }
  const databaseDefaultSourceRunId = databaseDefaults[0].source_run_id
  const databaseDefault = databaseDefaults[0]
  if (
    !deployedSourceRunIds.has(databaseDefaultSourceRunId) &&
    (
      databaseDefault.project_id !== variantSet.canonicalProjectId ||
      databaseDefault.status !== 'published' ||
      databaseDefault.quality_status !== 'verified' ||
      !databaseDefault.is_current
    )
  ) {
    throw new Error(
      `Undeployed default model-variant record ${databaseDefaultSourceRunId} is not a current verified release.`,
    )
  }
  const defaultSourceRunId = deployedSourceRunIds.has(databaseDefaultSourceRunId)
    ? databaseDefaultSourceRunId
    : variantSet.defaultSourceRunId

  return {
    ...variantSet,
    defaultSourceRunId,
    variants,
  }
}

export function resolveProjectModelVariant(
  variantSet: ProjectModelVariantSet,
  requestedSourceRunId?: string | null,
) {
  return variantSet.variants.find((variant) => variant.sourceRunId === requestedSourceRunId) ??
    variantSet.variants.find((variant) => variant.sourceRunId === variantSet.defaultSourceRunId) ??
    variantSet.variants[0]
}

export function resolveProjectModelVariantComparison(
  variantSet: ProjectModelVariantSet,
  activeSourceRunId: string,
  requestedSourceRunId?: string | null,
) {
  if (!requestedSourceRunId || requestedSourceRunId === activeSourceRunId) return null
  return variantSet.variants.find((variant) => variant.sourceRunId === requestedSourceRunId) ?? null
}
