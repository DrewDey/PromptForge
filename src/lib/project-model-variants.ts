import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sleepSoundMixerVariantSet from '../../seed-runs/model-variants/calming-sleep-sound-mixer.json'
import { loadSourceRunPackage, type SourceRunPackage } from './source-run-package'
import type { ProjectModelVariantPublicRecord } from './types'

export type ProjectModelProviderKey = 'openai' | 'anthropic' | 'google'
export type ProjectModelVariantOperatorKind =
  | 'original-author'
  | 'pathforge-labs-manual'
  | 'pathforge-labs-automation'
export type ProjectModelVariantQualityStatus = 'verified' | 'known-issue'

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
  sourceRunId: string
  providerKey: ProjectModelProviderKey
  serviceLabel: string
  modelLabel: string
  modelSettings: string
  operatorKind: ProjectModelVariantOperatorKind
  operatorLabel: string
  runRole: 'historical-baseline' | 'comparison-run'
  qualityStatus: ProjectModelVariantQualityStatus
  capturedAt: string
  promptCount: number
  repairPromptCount: number
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
  canonicalProjectId: string
  canonicalRoute: string
  title: string
  defaultSourceRunId: string
  contract: ProjectModelVariantContract
  variants: ProjectModelVariant[]
}

type RawProjectModelVariant = Omit<ProjectModelVariant, 'sourceRunPackage'>

type RawProjectModelVariantSet = Omit<ProjectModelVariantSet, 'variants'> & {
  variants: RawProjectModelVariant[]
}

const RAW_VARIANT_SETS = [sleepSoundMixerVariantSet] as unknown as RawProjectModelVariantSet[]

function assertNonEmpty(value: string, field: string) {
  if (!value.trim()) throw new Error(`Model-variant field "${field}" cannot be blank.`)
}

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

function seedRunPath(fileName: string) {
  return path.join(process.cwd(), 'seed-runs', fileName)
}

function resolveArtifactPath(fileName: string) {
  const relativePath = fileName.replace(/^public\/artifacts\//, '')
  return path.join(process.cwd(), 'public', 'artifacts', relativePath)
}

function validateMetrics(metrics: ProjectModelVariantMetrics, field: string) {
  if (!Number.isFinite(metrics.qualityScore) || metrics.qualityScore < 0 || metrics.qualityScore > 100) {
    throw new Error(`${field}.qualityScore must be between 0 and 100.`)
  }
  if (
    !Number.isInteger(metrics.functionalChecks.passed) ||
    !Number.isInteger(metrics.functionalChecks.total) ||
    metrics.functionalChecks.passed < 0 ||
    metrics.functionalChecks.total < 1 ||
    metrics.functionalChecks.passed > metrics.functionalChecks.total
  ) {
    throw new Error(`${field}.functionalChecks is invalid.`)
  }
  if (!Number.isInteger(metrics.consoleErrorCount) || metrics.consoleErrorCount < 0) {
    throw new Error(`${field}.consoleErrorCount must be a non-negative integer.`)
  }
  if (!Number.isFinite(metrics.horizontalOverflowPx) || metrics.horizontalOverflowPx < 0) {
    throw new Error(`${field}.horizontalOverflowPx must be non-negative.`)
  }
}

function prepareVariantSet(rawSet: RawProjectModelVariantSet): ProjectModelVariantSet {
  if (rawSet.schemaVersion !== 1) {
    throw new Error(`Unsupported model-variant schema version: ${rawSet.schemaVersion}.`)
  }
  assertNonEmpty(rawSet.canonicalProjectId, 'canonicalProjectId')
  assertNonEmpty(rawSet.canonicalRoute, 'canonicalRoute')
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
    if (variant.sourceRunId === rawSet.defaultSourceRunId) defaultCount += 1
    if (variant.promptCount < 1 || variant.repairPromptCount < 0 || variant.repairPromptCount >= variant.promptCount) {
      throw new Error(`Invalid prompt counts for model variant ${variant.sourceRunId}.`)
    }
    validateMetrics(variant.firstPassMetrics, `${variant.sourceRunId}.firstPassMetrics`)
    validateMetrics(variant.finalMetrics, `${variant.sourceRunId}.finalMetrics`)

    const sourceRunPackage = loadSourceRunPackage(variant.packageFile)
    if (sha256(readFileSync(seedRunPath(variant.packageFile))) !== variant.packageSha256) {
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
    if (sourceRunPackage.final_artifact_path !== variant.finalArtifactPath) {
      throw new Error(`Model variant ${variant.sourceRunId} final artifact does not match its package.`)
    }
    if (
      !sourceRunPackage.artifact_sha256 ||
      sha256(readFileSync(resolveArtifactPath(variant.finalArtifactPath))) !== sourceRunPackage.artifact_sha256
    ) {
      throw new Error(`Model variant ${variant.sourceRunId} final artifact hash does not match.`)
    }
    for (const artifactPath of variant.artifactVersionPaths) {
      if (!artifactPath.startsWith('public/artifacts/')) {
        throw new Error(`Model variant ${variant.sourceRunId} has an invalid artifact path.`)
      }
      readFileSync(
        path.join(
          process.cwd(),
          'public',
          'artifacts',
          artifactPath.replace(/^public\/artifacts\//, ''),
        ),
      )
    }

    return { ...variant, sourceRunPackage }
  })

  if (defaultCount !== 1) {
    throw new Error(`Model-variant set ${rawSet.canonicalProjectId} must have exactly one default run.`)
  }

  const historicalBaselines = variants.filter((variant) => variant.runRole === 'historical-baseline')
  if (
    historicalBaselines.length !== 1 ||
    historicalBaselines[0].operatorKind !== 'original-author'
  ) {
    throw new Error(
      `Model-variant set ${rawSet.canonicalProjectId} must have one original-author historical baseline.`,
    )
  }

  const defaultVariant = variants.find((variant) => variant.sourceRunId === rawSet.defaultSourceRunId)
  if (
    !defaultVariant ||
    defaultVariant.runRole !== 'comparison-run' ||
    defaultVariant.qualityStatus !== 'verified' ||
    !defaultVariant.finalMetrics.hardGatesPassed
  ) {
    throw new Error(
      `Model-variant set ${rawSet.canonicalProjectId} must default to a verified comparison run.`,
    )
  }

  return { ...rawSet, variants }
}

const PREPARED_VARIANT_SETS = RAW_VARIANT_SETS.map(prepareVariantSet)

export function getProjectModelVariantSet(projectId: string) {
  return PREPARED_VARIANT_SETS.find((set) => set.canonicalProjectId === projectId) ?? null
}

export function reconcileProjectModelVariantSet(
  variantSet: ProjectModelVariantSet,
  records: ProjectModelVariantPublicRecord[],
): ProjectModelVariantSet {
  if (records.length === 0) return variantSet

  const recordsBySourceRunId = new Map(records.map((record) => [record.source_run_id, record]))
  const variants = variantSet.variants.filter((variant) => {
    const record = recordsBySourceRunId.get(variant.sourceRunId)
    if (!record) return false
    if (
      record.project_id !== variantSet.canonicalProjectId ||
      record.provider_key !== variant.providerKey ||
      record.service_label !== variant.serviceLabel ||
      record.model_label !== variant.modelLabel ||
      record.source_url !== variant.sourceRunPackage.source_url ||
      record.final_artifact_path !== variant.finalArtifactPath ||
      record.prompt_count !== variant.promptCount
    ) {
      throw new Error(`Published model-variant record ${record.source_run_id} does not match its release payload.`)
    }
    return true
  })

  if (variants.length !== records.length) {
    throw new Error(
      `Published model-variant records for ${variantSet.canonicalProjectId} do not match the deployed release payloads.`,
    )
  }

  const databaseDefaults = records.filter((record) => record.is_default)
  if (databaseDefaults.length !== 1) {
    throw new Error(
      `Published model-variant records for ${variantSet.canonicalProjectId} need exactly one default.`,
    )
  }
  const defaultSourceRunId = databaseDefaults[0].source_run_id
  if (!variants.some((variant) => variant.sourceRunId === defaultSourceRunId)) {
    throw new Error(
      `Default model-variant record ${defaultSourceRunId} has no deployed release payload.`,
    )
  }

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
