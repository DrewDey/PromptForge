import type { PromptWithRelations } from './types'
import type { PublicEvidenceTruth } from './public-source-evidence'

/**
 * Product depth is expressed as ten total display levels, including the root.
 *
 * The persisted fork-depth column predates display levels: the first fork is
 * stored at depth 0. Consequently, valid fork rows use stored depths 0..8 and
 * display at levels 2..10. Keep PROJECT_FORK_MAX_DEPTH as the compatibility
 * name consumed by older presentation code, but never compare a stored depth
 * directly to it.
 */
export const PROJECT_FORK_MAX_LEVELS = 10
export const PROJECT_FORK_MAX_EDGES = PROJECT_FORK_MAX_LEVELS - 1
export const PROJECT_FORK_MAX_STORED_DEPTH = PROJECT_FORK_MAX_LEVELS - 2
export const PROJECT_FORK_MAX_DEPTH = PROJECT_FORK_MAX_LEVELS
export const PROJECT_FORK_MAX_WIDTH = 10

export const PROJECT_FORK_QUERY_KEYS = {
  sourceProjectId: 'fork',
  sourceProjectTitle: 'forkTitle',
  sourceModelVariantId: 'forkVariant',
  sourceRunId: 'forkRun',
  sourceStepId: 'forkStep',
  sourceStepNumber: 'forkStepNumber',
  sourceArtifactPath: 'forkArtifact',
  sourceArtifactSha256: 'forkArtifactSha256',
  parentForkId: 'parentFork',
  depth: 'forkDepth',
  branchIndex: 'forkBranch',
  promptFamilyId: 'promptFamily',
} as const

export type ProjectForkSourceStep = {
  id: string
  stepNumber: number
  promptTitle: string
  promptText: string
  responseText?: string | null
  responseLabel?: string
  responseDisclosure?: string
  responsePackageId: string
  sourceModelVariantId?: string
  sourceRunId?: string
  /** Exact persisted response evidence; never a DOM/package anchor. */
  sourceStepId?: string
  sourceStepNumber?: number
  artifactPath?: string | null
  artifactSha256?: string | null
  artifactVersions?: ProjectForkArtifactVersion[]
}

export type ProjectForkSource = {
  sourceProjectId: string
  sourceProjectTitle?: string
  sourceModelVariantId?: string
  sourceRunId?: string
  sourceStepId?: string
  sourceStepNumber?: number
  sourceArtifactPath?: string
  sourceArtifactSha256?: string
  parentForkId?: string
  depth: number
  branchIndex: number
  promptFamilyId?: string
}

export type ProjectForkHrefOptions = {
  destination?: '/prompt/new' | '/build'
}

export type ProjectForkSegmentState = 'shared-history' | 'fork-point' | 'original-continuation'

export type ProjectForkLineageSegment = ProjectForkSourceStep & {
  state: ProjectForkSegmentState
  muted: boolean
}

export type ProjectForkDraftContract = {
  source: ProjectForkSource
  forkPointStep: ProjectForkSourceStep | null
  sharedStepIds: string[]
  originalContinuationStepIds: string[]
  lineageSegments: ProjectForkLineageSegment[]
  maxDepth: typeof PROJECT_FORK_MAX_DEPTH
  maxWidth: typeof PROJECT_FORK_MAX_WIDTH
  promptFamilyId?: string
}

export type CreateProjectForkDraftInput = {
  source: ProjectForkSource
  firstForkPrompt?: string
  sourceRunUrl?: string
}

export type BuildProjectResponseForkHrefInput = {
  sourceProjectId: string
  sourceProjectTitle?: string
  sourceModelVariantId?: string
  sourceRunId?: string
  sourceStepId: string
  sourceStepNumber?: number
  sourceArtifactPath?: string
  sourceArtifactSha256?: string
  currentForkSource?: ProjectForkSource | null
  promptFamilyId?: string
  branchIndex?: number
  destination?: ProjectForkHrefOptions['destination']
}

export type ProjectForkSourceSubmissionFields = {
  fork_source_project_id?: string | null
  fork_source_project_title?: string | null
  fork_source_model_variant_id?: string | null
  fork_source_run_id?: string | null
  fork_source_step_id?: string | null
  fork_source_step_number?: number | null
  fork_source_artifact_path?: string | null
  fork_source_artifact_sha256?: string | null
  fork_parent_submission_id?: string | null
  prompt_family_id?: string | null
  fork_depth?: number | null
  fork_branch_index?: number | null
}

export type ProjectForkNetworkItem = {
  id: string
  title: string
  description?: string | null
  authorUsername?: string | null
  authorDisplayName?: string | null
  modelUsed?: string | null
  createdAt: string
  forkSource: ProjectForkSource
  continuationSteps?: ProjectForkContinuationStep[]
  childRoute?: string | null
  childSourceRunId?: string | null
  childSourceUrl?: string | null
  childSourceEvidence?: PublicEvidenceTruth | null
  childProviderName?: string | null
  childArtifactQualityStatus?: 'verified' | 'known-issue' | 'recorded' | null
  childArtifactKnownIssueExplanation?: string | null
  /** Bounded authoritative or explicitly code-backed root-to-child truth. */
  lineageTruth?: ProjectForkLineageTruth | null
}

export type ProjectForkArtifactVersion = {
  id: string
  /** Local/public viewer route; may differ from immutable stored evidence. */
  artifactPath: string
  /** Exact persisted artifact evidence path used for lineage validation. */
  sourceArtifactPath?: string
  artifactTitle: string
  artifactSha256?: string
  sourceModelVariantId?: string
  sourceRunId?: string
  sourceStepId?: string
  sourceStepNumber?: number
  isDefault?: boolean
}

export type ProjectForkContinuationStep = ProjectForkSourceStep & {
  artifactVersions?: ProjectForkArtifactVersion[]
  forkHref?: string | null
}

export type ProjectForkNetworkRow = {
  step: ProjectForkSourceStep
  forks: ProjectForkNetworkItem[]
}

export type ProjectForkNetworkGrouping = {
  rows: ProjectForkNetworkRow[]
  unmatchedForks: ProjectForkNetworkItem[]
}

export type ProjectForkTrailProject = ProjectForkSourceSubmissionFields & {
  id: string
  title: string
}

export type ProjectForkTrailNode = {
  id: string
  title: string
  forkSource?: ProjectForkSource
  isCurrent: boolean
  isMissingSource: boolean
}

export type ProjectForkTrail<TProject extends ProjectForkTrailProject = ProjectForkTrailProject> = {
  nodes: ProjectForkTrailNode[]
  immediateSourceProject: TProject | null
  missingSourceProjectId?: string
  cycleDetected: boolean
  truncated: boolean
}

export type ProjectForkTrailProjectResolver<TProject extends ProjectForkTrailProject> = (
  projectId: string
) => TProject | null | Promise<TProject | null>

export type ProjectForkLineageIntegrityKind =
  | 'complete'
  | 'missing-parent'
  | 'cycle'
  | 'truncated'
  | 'unavailable'
  | 'invalid'

export type ProjectForkEligibilityReason =
  | 'eligible'
  | 'max-depth'
  | 'missing-parent'
  | 'cycle'
  | 'truncated'
  | 'unavailable'
  | 'invalid'

export type ProjectForkLineageIssueKind =
  | 'stale-stored-depth'
  | 'invalid-branch-index'
  | 'family-mismatch'
  | 'source-project-mismatch'
  | 'source-model-variant-mismatch'
  | 'source-run-mismatch'
  | 'source-step-mismatch'
  | 'source-artifact-mismatch'
  | 'source-sha-mismatch'
  | 'missing-parent'
  | 'cycle'
  | 'truncated'
  | 'unavailable'
  | 'current-node-mismatch'
  | 'invalid-target-prompt'

export type ProjectForkLineageIssue = {
  kind: ProjectForkLineageIssueKind
  projectId?: string
  expected?: string | number | null
  observed?: string | number | null
}

export type ProjectForkLineageReadSource =
  | 'database-rpc'
  | 'code-backed'
  | 'test-fixture'

export type ProjectForkLineagePresentation = {
  href: string | null
  modelLabel?: string | null
  providerName?: string | null
  localSteps: ProjectForkContinuationStep[]
}

export type ProjectForkLineageResponseIdentity = {
  projectId: string
  projectTitle?: string
  modelVariantId?: string
  runId?: string
  /** Exact persisted source evidence identity. */
  stepId: string
  stepNumber?: number
  /** Local presentation step whose response card owns this edge. */
  localStepId: string
  /** Persisted response-package identity; currently canonical with stepId. */
  responsePackageId: string
  /** Local presentation package/card anchor, which may differ from evidence. */
  localResponsePackageId: string
  responseText?: string | null
  responseLabel?: string
  responseDisclosure?: string
  artifactPath?: string
  artifactSha256?: string
  artifactVersions?: ProjectForkArtifactVersion[]
}

export type ProjectForkLineagePromptIdentity = {
  projectId: string
  stepId: string
  stepNumber: number
  promptTitle: string
  promptText: string
}

export type ProjectForkLineageEdge = {
  storedDepth: number
  branchIndex: number
  promptFamilyId?: string
  sourceResponse: ProjectForkLineageResponseIdentity
  targetPrompt: ProjectForkLineagePromptIdentity
}

export type ProjectForkLineageGeneration<TProject = unknown> = {
  /** One-based product level. Valid public lineages use levels 1..10. */
  displayLevel: number
  /** Zero-based layout index only; never persistence authority. */
  generationIndex: number
  projectId: string
  title: string
  isCurrent: boolean
  project: TProject | null
  presentation: ProjectForkLineagePresentation
  /** Exact persisted incoming fork tuple. The root has no fork source. */
  forkSource: ProjectForkSource | null
  /** Explicit parent-response -> child-first-prompt connector. */
  incomingEdge: ProjectForkLineageEdge | null
}

/** Compatibility alias for consumers that use the shorter product term. */
export type ProjectForkGeneration<TProject = unknown> =
  ProjectForkLineageGeneration<TProject>

export type ProjectForkLineageIntegrity = {
  kind: ProjectForkLineageIntegrityKind
  affectedProjectId?: string
  issues: ProjectForkLineageIssue[]
}

export type ProjectForkEligibility = {
  allowed: boolean
  reason: ProjectForkEligibilityReason
  currentDisplayLevel: number | null
  currentStoredDepth: number | null
  nextStoredDepth: number | null
}

export type ProjectForkLineageTruth<TProject = unknown> = {
  readSource: ProjectForkLineageReadSource
  generations: ProjectForkLineageGeneration<TProject>[]
  immediateSourceProject: TProject | null
  integrity: ProjectForkLineageIntegrity
  eligibility: ProjectForkEligibility
  maxDepth: typeof PROJECT_FORK_MAX_DEPTH
  maxLevels: typeof PROJECT_FORK_MAX_LEVELS
  maxWidth: typeof PROJECT_FORK_MAX_WIDTH
}

export type ProjectForkLineageCandidateNode<TProject = unknown> = {
  projectId: string
  title: string
  project?: TProject | null
  presentation?: Partial<ProjectForkLineagePresentation>
  /** Authoritative family stored on this project, when present. */
  promptFamilyId?: string | null
  forkSource?: ProjectForkSource | null
}

export type BuildProjectForkLineageTruthInput<TProject = unknown> = {
  nodes: ProjectForkLineageCandidateNode<TProject>[]
  currentProjectId: string
  readSource?: ProjectForkLineageReadSource
  integrity?: {
    kind: ProjectForkLineageIntegrityKind
    affectedProjectId?: string
    issues?: ProjectForkLineageIssue[]
  }
}

export function chunkProjectForkLineageIds(
  projectIds: string[],
  batchLimit: number,
) {
  if (!Number.isInteger(batchLimit) || batchLimit < 1) {
    throw new Error('Fork lineage batch limit must be a positive integer.')
  }
  const uniqueIds = [...new Set(projectIds.map((id) => id.trim()).filter(Boolean))]
  const batches: string[][] = []
  for (let index = 0; index < uniqueIds.length; index += batchLimit) {
    batches.push(uniqueIds.slice(index, index + batchLimit))
  }
  return batches
}

export function selectProjectForkLineageTruth<TProject>({
  databaseTruth,
  codeBackedTruth,
  codeBackedAuthority = false,
}: {
  databaseTruth?: ProjectForkLineageTruth<TProject> | null
  codeBackedTruth?: ProjectForkLineageTruth<TProject> | null
  codeBackedAuthority?: boolean
}) {
  if (codeBackedAuthority && codeBackedTruth) return codeBackedTruth
  if (databaseTruth && databaseTruth.integrity.kind !== 'unavailable') {
    return codeBackedTruth
      ? enrichAuthoritativeProjectForkPresentation(
          databaseTruth,
          codeBackedTruth,
        )
      : databaseTruth
  }
  if (databaseTruth) return databaseTruth
  return codeBackedTruth ?? null
}

/**
 * Attach exact local presentation packages to database-owned candidate nodes
 * before the shared builder validates response and prompt anchors.
 *
 * Database rows remain the only source of project order, stored fork
 * coordinates, families, and provenance. The presentation truth may replace
 * only the route/model/step payload for the same project IDs.
 */
export function overlayProjectForkLineagePresentations<TProject>(
  nodes: ProjectForkLineageCandidateNode<TProject>[],
  presentationTruth?: Pick<ProjectForkLineageTruth<unknown>, 'generations'> | null,
) {
  if (!presentationTruth) return nodes
  const presentationByProjectId = new Map(
    presentationTruth.generations.map((generation) => [
      generation.projectId,
      generation.presentation,
    ]),
  )
  return nodes.map((node) => ({
    ...node,
    presentation: presentationByProjectId.get(node.projectId)
      ?? node.presentation,
  }))
}

/**
 * Preserve database lineage authority while replacing only known presentation
 * payloads with exact code-backed run packages. The rebuilt truth revalidates
 * every DB-owned edge against the overlaid local response/artifact package.
 */
export function enrichAuthoritativeProjectForkPresentation<
  TDatabaseProject,
  TPresentationProject,
>(
  databaseTruth: ProjectForkLineageTruth<TDatabaseProject>,
  presentationTruth: ProjectForkLineageTruth<TPresentationProject>,
): ProjectForkLineageTruth<TDatabaseProject> {
  const currentProjectId = databaseTruth.generations
    .find((generation) => generation.isCurrent)?.projectId
    ?? databaseTruth.integrity.affectedProjectId
    ?? ''

  return buildProjectForkLineageTruth({
    nodes: overlayProjectForkLineagePresentations(
      databaseTruth.generations.map((generation) => ({
        projectId: generation.projectId,
        title: generation.title,
        project: generation.project,
        presentation: generation.presentation,
        promptFamilyId: generation.forkSource?.promptFamilyId ?? null,
        forkSource: generation.forkSource,
      })),
      presentationTruth,
    ),
    currentProjectId,
    readSource: 'database-rpc',
    integrity: databaseTruth.integrity,
  })
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

function normalizeStoredForkCoordinate(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.trunc(value)
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

/**
 * Resolve the model-variant identity for an already exact-matched source run.
 *
 * Prepared variant manifests do not always carry their reconciled database ID.
 * In that case the exact prepared outgoing fork edge may supply it. A
 * reconciled manifest and prepared edge must agree when both identities exist.
 */
export function resolveExactProjectForkModelVariantIdentity({
  registeredModelVariantId,
  claimedModelVariantId,
}: {
  registeredModelVariantId?: string | null
  claimedModelVariantId?: string | null
}): {
  valid: boolean
  sourceModelVariantId?: string
} {
  const registered = normalizeOptional(registeredModelVariantId)
  const claimed = normalizeOptional(claimedModelVariantId)
  if (registered && claimed && registered !== claimed) return { valid: false }
  return {
    valid: true,
    sourceModelVariantId: registered ?? claimed,
  }
}

export function normalizeProjectForkSource(source: Partial<ProjectForkSource> & { sourceProjectId: string }): ProjectForkSource {
  return {
    sourceProjectId: source.sourceProjectId,
    sourceProjectTitle: normalizeOptional(source.sourceProjectTitle),
    sourceModelVariantId: normalizeOptional(source.sourceModelVariantId),
    sourceRunId: normalizeOptional(source.sourceRunId),
    sourceStepId: normalizeOptional(source.sourceStepId),
    sourceStepNumber: source.sourceStepNumber && source.sourceStepNumber > 0
      ? Math.trunc(source.sourceStepNumber)
      : undefined,
    sourceArtifactPath: normalizeOptional(source.sourceArtifactPath),
    sourceArtifactSha256: normalizeOptional(source.sourceArtifactSha256)?.toLowerCase(),
    parentForkId: normalizeOptional(source.parentForkId),
    // Do not clamp legacy over-depth rows into apparently valid level-10
    // lineage. Validation reports the observed stored value truthfully.
    depth: normalizeStoredForkCoordinate(source.depth ?? 0),
    branchIndex: normalizeStoredForkCoordinate(source.branchIndex ?? 0),
    promptFamilyId: normalizeOptional(source.promptFamilyId),
  }
}

export function parseProjectForkSearchParams(params: Pick<URLSearchParams, 'get'>): ProjectForkSource | null {
  const sourceProjectId = normalizeOptional(params.get(PROJECT_FORK_QUERY_KEYS.sourceProjectId))
  if (!sourceProjectId) return null

  return normalizeProjectForkSource({
    sourceProjectId,
    sourceProjectTitle: params.get(PROJECT_FORK_QUERY_KEYS.sourceProjectTitle) ?? undefined,
    sourceModelVariantId: params.get(PROJECT_FORK_QUERY_KEYS.sourceModelVariantId) ?? undefined,
    sourceRunId: params.get(PROJECT_FORK_QUERY_KEYS.sourceRunId) ?? undefined,
    sourceStepId: params.get(PROJECT_FORK_QUERY_KEYS.sourceStepId) ?? undefined,
    sourceStepNumber: parsePositiveInteger(params.get(PROJECT_FORK_QUERY_KEYS.sourceStepNumber), 0) || undefined,
    sourceArtifactPath: params.get(PROJECT_FORK_QUERY_KEYS.sourceArtifactPath) ?? undefined,
    sourceArtifactSha256: params.get(PROJECT_FORK_QUERY_KEYS.sourceArtifactSha256) ?? undefined,
    parentForkId: params.get(PROJECT_FORK_QUERY_KEYS.parentForkId) ?? undefined,
    depth: parsePositiveInteger(params.get(PROJECT_FORK_QUERY_KEYS.depth), 0),
    branchIndex: parsePositiveInteger(params.get(PROJECT_FORK_QUERY_KEYS.branchIndex), 0),
    promptFamilyId: params.get(PROJECT_FORK_QUERY_KEYS.promptFamilyId) ?? undefined,
  })
}

export function buildProjectForkHref(
  source: Partial<ProjectForkSource> & { sourceProjectId: string },
  options: ProjectForkHrefOptions = {},
) {
  const normalized = normalizeProjectForkSource(source)
  const params = new URLSearchParams({ [PROJECT_FORK_QUERY_KEYS.sourceProjectId]: normalized.sourceProjectId })

  if (normalized.sourceProjectTitle) {
    params.set(PROJECT_FORK_QUERY_KEYS.sourceProjectTitle, normalized.sourceProjectTitle)
  }
  if (normalized.sourceModelVariantId) {
    params.set(PROJECT_FORK_QUERY_KEYS.sourceModelVariantId, normalized.sourceModelVariantId)
  }
  if (normalized.sourceRunId) params.set(PROJECT_FORK_QUERY_KEYS.sourceRunId, normalized.sourceRunId)
  if (normalized.sourceStepId) params.set(PROJECT_FORK_QUERY_KEYS.sourceStepId, normalized.sourceStepId)
  if (normalized.sourceStepNumber) {
    params.set(PROJECT_FORK_QUERY_KEYS.sourceStepNumber, String(normalized.sourceStepNumber))
  }
  if (normalized.sourceArtifactPath) {
    params.set(PROJECT_FORK_QUERY_KEYS.sourceArtifactPath, normalized.sourceArtifactPath)
  }
  if (normalized.sourceArtifactSha256) {
    params.set(PROJECT_FORK_QUERY_KEYS.sourceArtifactSha256, normalized.sourceArtifactSha256)
  }
  if (normalized.parentForkId) params.set(PROJECT_FORK_QUERY_KEYS.parentForkId, normalized.parentForkId)
  if (normalized.depth > 0) params.set(PROJECT_FORK_QUERY_KEYS.depth, String(normalized.depth))
  if (normalized.branchIndex > 0) params.set(PROJECT_FORK_QUERY_KEYS.branchIndex, String(normalized.branchIndex))
  if (normalized.promptFamilyId) params.set(PROJECT_FORK_QUERY_KEYS.promptFamilyId, normalized.promptFamilyId)

  return `${options.destination ?? '/prompt/new'}?${params.toString()}`
}

export function buildCommunityProjectForkHref(
  source: Partial<ProjectForkSource> & { sourceProjectId: string },
) {
  return buildProjectForkHref(source, { destination: '/build' })
}

export function buildProjectResponseForkHref({
  sourceProjectId,
  sourceProjectTitle,
  sourceModelVariantId,
  sourceRunId,
  sourceStepId,
  sourceStepNumber,
  sourceArtifactPath,
  sourceArtifactSha256,
  currentForkSource,
  promptFamilyId,
  branchIndex = 0,
  destination,
}: BuildProjectResponseForkHrefInput) {
  const nextDepth = currentForkSource ? currentForkSource.depth + 1 : 0
  if (nextDepth > PROJECT_FORK_MAX_STORED_DEPTH) return null
  if (
    sourceRunId &&
    (
      !sourceArtifactPath?.startsWith('public/artifacts/') ||
      !sourceArtifactSha256 ||
      !/^[0-9a-f]{64}$/i.test(sourceArtifactSha256)
    )
  ) {
    return null
  }

  return buildProjectForkHref({
    sourceProjectId,
    sourceProjectTitle,
    sourceModelVariantId,
    sourceRunId,
    sourceStepId,
    sourceStepNumber,
    sourceArtifactPath,
    sourceArtifactSha256,
    parentForkId: currentForkSource ? sourceProjectId : undefined,
    depth: nextDepth,
    branchIndex,
    promptFamilyId: currentForkSource?.promptFamilyId ?? promptFamilyId ?? `${sourceProjectId}:${sourceStepId}`,
  }, { destination })
}

export function projectForkSourceToSubmissionFields(
  source?: ProjectForkSource | null,
): ProjectForkSourceSubmissionFields {
  if (!source?.sourceProjectId) return {}
  const normalized = normalizeProjectForkSource(source)

  return {
    fork_source_project_id: normalized.sourceProjectId,
    fork_source_project_title: normalized.sourceProjectTitle ?? null,
    fork_source_model_variant_id: normalized.sourceModelVariantId ?? null,
    fork_source_run_id: normalized.sourceRunId ?? null,
    fork_source_step_id: normalized.sourceStepId ?? null,
    fork_source_step_number: normalized.sourceStepNumber ?? null,
    fork_source_artifact_path: normalized.sourceArtifactPath ?? null,
    fork_source_artifact_sha256: normalized.sourceArtifactSha256 ?? null,
    fork_parent_submission_id: normalized.parentForkId ?? null,
    prompt_family_id: normalized.promptFamilyId ?? null,
    fork_depth: normalized.depth,
    fork_branch_index: normalized.branchIndex,
  }
}

export function projectForkSourceFromSubmissionFields(
  fields: ProjectForkSourceSubmissionFields,
): ProjectForkSource | null {
  if (!fields.fork_source_project_id) return null

  return normalizeProjectForkSource({
    sourceProjectId: fields.fork_source_project_id,
    sourceProjectTitle: fields.fork_source_project_title ?? undefined,
    sourceModelVariantId: fields.fork_source_model_variant_id ?? undefined,
    sourceRunId: fields.fork_source_run_id ?? undefined,
    sourceStepId: fields.fork_source_step_id ?? undefined,
    sourceStepNumber: fields.fork_source_step_number ?? undefined,
    sourceArtifactPath: fields.fork_source_artifact_path ?? undefined,
    sourceArtifactSha256: fields.fork_source_artifact_sha256 ?? undefined,
    parentForkId: fields.fork_parent_submission_id ?? undefined,
    depth: fields.fork_depth ?? 0,
    branchIndex: fields.fork_branch_index ?? 0,
    promptFamilyId: fields.prompt_family_id ?? undefined,
  })
}

export function toProjectForkSourceSteps(project: Pick<PromptWithRelations, 'steps'>): ProjectForkSourceStep[] {
  return [...(project.steps ?? [])]
    .sort((a, b) => a.step_number - b.step_number)
    .map((step) => ({
      id: step.id,
      stepNumber: step.step_number,
      promptTitle: step.title || `Prompt ${step.step_number}`,
      promptText: step.content,
      responseText: step.result_content,
      responsePackageId: step.id,
    }))
}

export function communityProjectContinuationSteps(
  childSteps: ProjectForkSourceStep[],
): ProjectForkContinuationStep[] {
  return [...childSteps].sort((left, right) => left.stepNumber - right.stepNumber)
}

export function selectProjectForkLocalSteps<TStep extends { stepNumber: number }>(
  steps: TStep[],
  parentSourceStepNumber = 0,
) {
  return [...steps]
    .filter((step) => step.stepNumber > parentSourceStepNumber)
    .sort((left, right) => left.stepNumber - right.stepNumber)
}

function lineageIssue(
  kind: ProjectForkLineageIssueKind,
  values: Omit<ProjectForkLineageIssue, 'kind'> = {},
): ProjectForkLineageIssue {
  return { kind, ...values }
}

function lineageEligibilityReason(
  kind: ProjectForkLineageIntegrityKind,
): Exclude<ProjectForkEligibilityReason, 'eligible' | 'max-depth'> {
  if (kind === 'complete') return 'invalid'
  return kind
}

function strongerLineageIntegrity(
  current: ProjectForkLineageIntegrityKind,
  next: ProjectForkLineageIntegrityKind,
) {
  const priority: Record<ProjectForkLineageIntegrityKind, number> = {
    complete: 0,
    invalid: 1,
    'missing-parent': 2,
    truncated: 3,
    cycle: 4,
    unavailable: 5,
  }
  return priority[next] > priority[current] ? next : current
}

export function deriveProjectForkEligibility({
  integrity,
  currentDisplayLevel,
  currentStoredDepth,
}: {
  integrity: Pick<ProjectForkLineageIntegrity, 'kind'>
  currentDisplayLevel: number | null
  currentStoredDepth: number | null
}): ProjectForkEligibility {
  if (integrity.kind !== 'complete') {
    return {
      allowed: false,
      reason: lineageEligibilityReason(integrity.kind),
      currentDisplayLevel,
      currentStoredDepth,
      nextStoredDepth: null,
    }
  }

  if (
    currentDisplayLevel === null ||
    currentDisplayLevel < 1 ||
    currentDisplayLevel > PROJECT_FORK_MAX_LEVELS
  ) {
    return {
      allowed: false,
      reason: 'invalid',
      currentDisplayLevel,
      currentStoredDepth,
      nextStoredDepth: null,
    }
  }

  if (
    currentDisplayLevel === PROJECT_FORK_MAX_LEVELS ||
    currentStoredDepth !== null && currentStoredDepth >= PROJECT_FORK_MAX_STORED_DEPTH
  ) {
    return {
      allowed: false,
      reason: 'max-depth',
      currentDisplayLevel,
      currentStoredDepth,
      nextStoredDepth: null,
    }
  }

  return {
    allowed: true,
    reason: 'eligible',
    currentDisplayLevel,
    currentStoredDepth,
    nextStoredDepth: currentStoredDepth === null ? 0 : currentStoredDepth + 1,
  }
}

function findLineageSourceStep(
  steps: ProjectForkContinuationStep[],
  source: ProjectForkSource,
) {
  if (source.sourceStepId) {
    return steps.find((step) => (
      step.id === source.sourceStepId ||
      step.artifactVersions?.some((artifact) => (
        artifact.sourceStepId === source.sourceStepId
      ))
    )) ?? null
  }
  if (source.sourceStepNumber) {
    return steps.find((step) => step.stepNumber === source.sourceStepNumber) ?? null
  }
  return steps.at(-1) ?? null
}

function findArtifactVersion(
  step: ProjectForkContinuationStep | null,
  artifactPath?: string,
) {
  if (!step || !artifactPath) return null
  return step.artifactVersions?.find((artifact) => (
    projectForkArtifactPathsEquivalent(
      artifactPath,
      artifact.sourceArtifactPath ?? artifact.artifactPath,
    ) &&
    (
      !artifact.sourceArtifactPath ||
      projectForkArtifactPathsEquivalent(
        artifact.sourceArtifactPath,
        artifact.artifactPath,
      )
    )
  )) ?? null
}

export function projectForkArtifactPathsEquivalent(
  evidencePath: string,
  presentationPath: string,
) {
  const hasUnsafePathShape = (value: string) => (
    !value ||
    value.includes('\\') ||
    value.includes('?') ||
    value.includes('#') ||
    value.split('/').some((segment) => segment === '.' || segment === '..')
  )
  if (hasUnsafePathShape(evidencePath) || hasUnsafePathShape(presentationPath)) {
    return false
  }
  if (evidencePath === presentationPath) return true
  if (!evidencePath.startsWith('public/artifacts/')) return false
  return presentationPath === `/${evidencePath.slice('public/'.length)}`
}

/**
 * Pure, database-free construction and validation seam used by the server
 * loader, code-backed prepared adapters, and deterministic fixtures.
 *
 * Input nodes must be ordered root -> current. Known prefixes may still be
 * returned for broken lineage, but any integrity problem fails fork eligibility
 * closed. Over-depth input is never clamped into a valid ten-level chain.
 */
export function buildProjectForkLineageTruth<TProject = unknown>({
  nodes,
  currentProjectId,
  readSource = 'test-fixture',
  integrity: suppliedIntegrity = { kind: 'complete' },
}: BuildProjectForkLineageTruthInput<TProject>): ProjectForkLineageTruth<TProject> {
  const issues = [...(suppliedIntegrity.issues ?? [])]
  const boundedNodes = nodes.slice(0, PROJECT_FORK_MAX_LEVELS)
  let integrityKind = suppliedIntegrity.kind
  let affectedProjectId = suppliedIntegrity.affectedProjectId

  if (nodes.length > PROJECT_FORK_MAX_LEVELS) {
    integrityKind = strongerLineageIntegrity(integrityKind, 'truncated')
    affectedProjectId ??= nodes[PROJECT_FORK_MAX_LEVELS]?.projectId
    issues.push(lineageIssue('truncated', {
      projectId: affectedProjectId,
      expected: PROJECT_FORK_MAX_LEVELS,
      observed: nodes.length,
    }))
  }

  if (boundedNodes.length === 0 && integrityKind === 'complete') {
    integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
    affectedProjectId ??= currentProjectId
  }

  const seenProjectIds = new Set<string>()
  const generations: ProjectForkLineageGeneration<TProject>[] = []

  for (let index = 0; index < boundedNodes.length; index += 1) {
    const node = boundedNodes[index]
    const parent = index > 0 ? boundedNodes[index - 1] : null
    const forkSource = node.forkSource
      ? normalizeProjectForkSource(node.forkSource)
      : null

    if (seenProjectIds.has(node.projectId)) {
      integrityKind = strongerLineageIntegrity(integrityKind, 'cycle')
      affectedProjectId ??= node.projectId
      issues.push(lineageIssue('cycle', {
        projectId: node.projectId,
        expected: 'unique-project-id',
        observed: node.projectId,
      }))
      break
    }

    if (index > 0 && !forkSource) {
      integrityKind = strongerLineageIntegrity(integrityKind, 'missing-parent')
      affectedProjectId ??= node.projectId
      issues.push(lineageIssue('missing-parent', {
        projectId: node.projectId,
        expected: 'fork-source-for-descendant',
        observed: null,
      }))
      break
    }

    if (
      forkSource &&
      (
        forkSource.depth < 0 ||
        forkSource.depth > PROJECT_FORK_MAX_STORED_DEPTH
      )
    ) {
      integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
      affectedProjectId ??= node.projectId
      issues.push(lineageIssue('stale-stored-depth', {
        projectId: node.projectId,
        expected: `0..${PROJECT_FORK_MAX_STORED_DEPTH}`,
        observed: forkSource.depth,
      }))
      break
    }

    const displayLevel = forkSource ? forkSource.depth + 2 : 1
    const localSteps = communityProjectContinuationSteps(
      node.presentation?.localSteps ?? [],
    )
    let incomingEdge: ProjectForkLineageEdge | null = null

    seenProjectIds.add(node.projectId)

    if (index === 0) {
      if (forkSource && suppliedIntegrity.kind === 'complete') {
        integrityKind = strongerLineageIntegrity(integrityKind, 'truncated')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('truncated', {
          projectId: node.projectId,
          expected: 'root-without-parent',
          observed: forkSource.sourceProjectId,
        }))
      }
    } else if (!forkSource || !parent) {
      integrityKind = strongerLineageIntegrity(integrityKind, 'missing-parent')
      affectedProjectId ??= node.projectId
      issues.push(lineageIssue('missing-parent', {
        projectId: node.projectId,
      }))
    } else {
      const expectedStoredDepth = parent.forkSource
        ? parent.forkSource.depth + 1
        : 0
      if (
        forkSource.depth !== expectedStoredDepth ||
        forkSource.depth < 0 ||
        forkSource.depth > PROJECT_FORK_MAX_STORED_DEPTH
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('stale-stored-depth', {
          projectId: node.projectId,
          expected: expectedStoredDepth,
          observed: forkSource.depth,
        }))
      }

      if (
        forkSource.branchIndex < 0 ||
        forkSource.branchIndex >= PROJECT_FORK_MAX_WIDTH
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('invalid-branch-index', {
          projectId: node.projectId,
          expected: `0..${PROJECT_FORK_MAX_WIDTH - 1}`,
          observed: forkSource.branchIndex,
        }))
      }

      if (forkSource.sourceProjectId !== parent.projectId) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-project-mismatch', {
          projectId: node.projectId,
          expected: parent.projectId,
          observed: forkSource.sourceProjectId,
        }))
      }

      const parentFamilyId = normalizeOptional(parent.promptFamilyId)
        ?? parent.forkSource?.promptFamilyId
      const expectedFamilyId = parent.forkSource
        ? parentFamilyId
        : forkSource.sourceStepId
          ? `${parent.projectId}:${forkSource.sourceStepId}`
          : undefined
      if (!forkSource.promptFamilyId || forkSource.promptFamilyId !== expectedFamilyId) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('family-mismatch', {
          projectId: node.projectId,
          expected: expectedFamilyId ?? 'canonical-source-project-response-family',
          observed: forkSource.promptFamilyId ?? null,
        }))
      }

      const parentSteps = communityProjectContinuationSteps(
        parent.presentation?.localSteps ?? [],
      )
      const sourceStep = findLineageSourceStep(parentSteps, forkSource)
      if (!forkSource.sourceStepId || !sourceStep) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-step-mismatch', {
          projectId: node.projectId,
          expected: 'real-parent-source-step',
          observed: forkSource.sourceStepId ?? forkSource.sourceStepNumber ?? null,
        }))
      }
      if (
        forkSource.sourceStepNumber &&
        sourceStep &&
        sourceStep.stepNumber !== forkSource.sourceStepNumber
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-step-mismatch', {
          projectId: node.projectId,
          expected: sourceStep.stepNumber,
          observed: forkSource.sourceStepNumber,
        }))
      }

      if (
        forkSource.sourceRunId &&
        sourceStep?.sourceRunId &&
        forkSource.sourceRunId !== sourceStep.sourceRunId
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-run-mismatch', {
          projectId: node.projectId,
          expected: sourceStep.sourceRunId,
          observed: forkSource.sourceRunId,
        }))
      }

      const artifactVersion = findArtifactVersion(
        sourceStep,
        forkSource.sourceArtifactPath,
      )
      if (
        forkSource.sourceModelVariantId &&
        (
          !sourceStep ||
          sourceStep.sourceModelVariantId !== forkSource.sourceModelVariantId
        )
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-model-variant-mismatch', {
          projectId: node.projectId,
          expected: sourceStep?.sourceModelVariantId
            ?? 'exact-selected-step-model-variant',
          observed: forkSource.sourceModelVariantId,
        }))
      }
      if (
        forkSource.sourceModelVariantId &&
        (
          !artifactVersion ||
          artifactVersion.sourceModelVariantId !== forkSource.sourceModelVariantId
        )
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-model-variant-mismatch', {
          projectId: node.projectId,
          expected: artifactVersion?.sourceModelVariantId
            ?? 'exact-selected-artifact-model-variant',
          observed: forkSource.sourceModelVariantId,
        }))
      }
      if (
        forkSource.sourceModelVariantId &&
        (
          !forkSource.sourceRunId ||
          !artifactVersion?.sourceRunId ||
          forkSource.sourceRunId !== artifactVersion.sourceRunId
        )
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-run-mismatch', {
          projectId: node.projectId,
          expected: artifactVersion?.sourceRunId ?? 'exact-model-variant-run',
          observed: forkSource.sourceRunId ?? null,
        }))
      }
      if (
        forkSource.sourceRunId &&
        artifactVersion?.sourceRunId &&
        forkSource.sourceRunId !== artifactVersion.sourceRunId
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-run-mismatch', {
          projectId: node.projectId,
          expected: artifactVersion.sourceRunId,
          observed: forkSource.sourceRunId,
        }))
      }
      if (
        forkSource.sourceStepId &&
        artifactVersion?.sourceStepId &&
        forkSource.sourceStepId !== artifactVersion.sourceStepId
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-step-mismatch', {
          projectId: node.projectId,
          expected: artifactVersion.sourceStepId,
          observed: forkSource.sourceStepId,
        }))
      }
      if (
        forkSource.sourceArtifactPath &&
        sourceStep?.artifactVersions?.length &&
        !artifactVersion
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-artifact-mismatch', {
          projectId: node.projectId,
          expected: sourceStep.artifactVersions
            .map((artifact) => artifact.sourceArtifactPath ?? artifact.artifactPath)
            .join(','),
          observed: forkSource.sourceArtifactPath,
        }))
      }
      if (
        forkSource.sourceArtifactSha256 &&
        artifactVersion?.artifactSha256 &&
        forkSource.sourceArtifactSha256 !== artifactVersion.artifactSha256
      ) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('source-sha-mismatch', {
          projectId: node.projectId,
          expected: artifactVersion.artifactSha256,
          observed: forkSource.sourceArtifactSha256,
        }))
      }

      const targetPrompt = localSteps[0] ?? null
      if (!targetPrompt) {
        integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
        affectedProjectId ??= node.projectId
        issues.push(lineageIssue('invalid-target-prompt', {
          projectId: node.projectId,
          expected: 'first-local-continuation-prompt',
          observed: null,
        }))
      } else if (sourceStep && forkSource.sourceStepId) {
        const sourceStepId = forkSource.sourceStepId
        incomingEdge = {
          storedDepth: forkSource.depth,
          branchIndex: forkSource.branchIndex,
          promptFamilyId: forkSource.promptFamilyId,
          sourceResponse: {
            projectId: forkSource.sourceProjectId,
            projectTitle: forkSource.sourceProjectTitle,
            modelVariantId: forkSource.sourceModelVariantId,
            runId: forkSource.sourceRunId,
            stepId: sourceStepId,
            stepNumber: forkSource.sourceStepNumber ?? sourceStep?.stepNumber,
            localStepId: sourceStep.id,
            responsePackageId: sourceStepId,
            localResponsePackageId: sourceStep.responsePackageId,
            responseText: sourceStep?.responseText,
            responseLabel: sourceStep?.responseLabel,
            responseDisclosure: sourceStep?.responseDisclosure,
            artifactPath: forkSource.sourceArtifactPath,
            artifactSha256: forkSource.sourceArtifactSha256,
            artifactVersions: sourceStep?.artifactVersions,
          },
          targetPrompt: {
            projectId: node.projectId,
            stepId: targetPrompt.id,
            stepNumber: targetPrompt.stepNumber,
            promptTitle: targetPrompt.promptTitle,
            promptText: targetPrompt.promptText,
          },
        }
      }
    }

    generations.push({
      displayLevel,
      generationIndex: displayLevel - 1,
      projectId: node.projectId,
      title: node.title,
      isCurrent: node.projectId === currentProjectId,
      project: node.project ?? null,
      presentation: {
        href: node.presentation?.href ?? null,
        modelLabel: node.presentation?.modelLabel,
        providerName: node.presentation?.providerName,
        localSteps,
      },
      forkSource,
      incomingEdge,
    })
  }

  const currentGenerations = generations.filter((generation) => generation.isCurrent)
  const currentGeneration = currentGenerations.length === 1
    ? currentGenerations[0]
    : null
  const finalGeneration = generations.at(-1) ?? null
  if (
    currentGenerations.length !== 1 ||
    !currentGeneration ||
    finalGeneration?.projectId !== currentProjectId
  ) {
    integrityKind = strongerLineageIntegrity(integrityKind, 'invalid')
    affectedProjectId ??= currentProjectId
    issues.push(lineageIssue('current-node-mismatch', {
      projectId: currentProjectId,
      expected: 'exactly-one-final-current-generation',
      observed: currentGenerations.length,
    }))
  }

  const integrity: ProjectForkLineageIntegrity = {
    kind: integrityKind,
    affectedProjectId,
    issues,
  }
  const currentStoredDepth = currentGeneration?.forkSource?.depth ?? null

  return {
    readSource,
    generations,
    immediateSourceProject: generations.length > 1
      ? generations.at(-2)?.project ?? null
      : null,
    integrity,
    eligibility: deriveProjectForkEligibility({
      integrity,
      currentDisplayLevel: currentGeneration?.displayLevel ?? null,
      currentStoredDepth,
    }),
    maxDepth: PROJECT_FORK_MAX_DEPTH,
    maxLevels: PROJECT_FORK_MAX_LEVELS,
    maxWidth: PROJECT_FORK_MAX_WIDTH,
  }
}

export function unavailableProjectForkLineageTruth<TProject = unknown>(
  currentProjectId: string,
  issue: Omit<ProjectForkLineageIssue, 'kind'> = {},
): ProjectForkLineageTruth<TProject> {
  return buildProjectForkLineageTruth<TProject>({
    nodes: [],
    currentProjectId,
    readSource: 'database-rpc',
    integrity: {
      kind: 'unavailable',
      affectedProjectId: issue.projectId ?? currentProjectId,
      issues: [lineageIssue('unavailable', {
        projectId: issue.projectId ?? currentProjectId,
        expected: issue.expected,
        observed: issue.observed,
      })],
    },
  })
}

export function markProjectForkNetworkLineageUnavailable(
  forks: ProjectForkNetworkItem[],
) {
  return forks.map((fork) => ({
    ...fork,
    continuationSteps: fork.continuationSteps?.map((step) => ({
      ...step,
      forkHref: null,
    })),
    lineageTruth: unavailableProjectForkLineageTruth(fork.id, {
      projectId: fork.id,
      expected: 'successful-authoritative-lineage-rpc',
      observed: 'authoritative-parent-read-unavailable',
    }),
  }))
}

export function resolveProjectForkPoint(
  sourceSteps: ProjectForkSourceStep[],
  source: Pick<ProjectForkSource, 'sourceStepId' | 'sourceStepNumber'>,
) {
  if (source.sourceStepId) {
    const match = sourceSteps.find((step) => step.id === source.sourceStepId)
    return match ?? null
  }

  if (source.sourceStepNumber) {
    const match = sourceSteps.find((step) => step.stepNumber === source.sourceStepNumber)
    return match ?? null
  }

  return sourceSteps[sourceSteps.length - 1] ?? null
}

export function createProjectForkDraftContract({
  source,
  sourceSteps,
}: {
  source: Partial<ProjectForkSource> & { sourceProjectId: string }
  sourceSteps: ProjectForkSourceStep[]
}): ProjectForkDraftContract {
  const normalizedSource = normalizeProjectForkSource(source)
  const forkPointStep = resolveProjectForkPoint(sourceSteps, normalizedSource)
  const lineageSegments = sourceSteps.map<ProjectForkLineageSegment>((step) => {
    const state: ProjectForkSegmentState = forkPointStep && step.stepNumber > forkPointStep.stepNumber
      ? 'original-continuation'
      : forkPointStep && step.id === forkPointStep.id
        ? 'fork-point'
        : 'shared-history'

    return {
      ...step,
      state,
      muted: state === 'original-continuation',
    }
  })

  return {
    source: normalizedSource,
    forkPointStep,
    sharedStepIds: lineageSegments
      .filter((step) => step.state === 'shared-history' || step.state === 'fork-point')
      .map((step) => step.id),
    originalContinuationStepIds: lineageSegments
      .filter((step) => step.state === 'original-continuation')
      .map((step) => step.id),
    lineageSegments,
    maxDepth: PROJECT_FORK_MAX_DEPTH,
    maxWidth: PROJECT_FORK_MAX_WIDTH,
    promptFamilyId: normalizedSource.promptFamilyId ?? (
      forkPointStep ? `${normalizedSource.sourceProjectId}:${forkPointStep.responsePackageId}` : undefined
    ),
  }
}

export function groupProjectForkNetworkBySourceStep(
  sourceSteps: ProjectForkSourceStep[],
  forks: ProjectForkNetworkItem[],
): ProjectForkNetworkGrouping {
  const matchedForkIds = new Set<string>()
  const rows = sourceSteps.map<ProjectForkNetworkRow>((step) => {
    const rowForks = forks.filter((fork) => {
      const matches = fork.forkSource.sourceStepId
        ? fork.forkSource.sourceStepId === step.id
        : fork.forkSource.sourceStepNumber === step.stepNumber
      if (matches) matchedForkIds.add(fork.id)
      return matches
    })
    return { step, forks: rowForks }
  })
  const unmatchedForks = forks.filter((fork) => !matchedForkIds.has(fork.id))

  return { rows, unmatchedForks }
}

export function filterProjectForkNetworkBySourceRun(
  forks: ProjectForkNetworkItem[],
  sourceRunId?: string | null,
) {
  const normalizedSourceRunId = normalizeOptional(sourceRunId)
  if (!normalizedSourceRunId) return forks

  return forks.filter((fork) => fork.forkSource.sourceRunId === normalizedSourceRunId)
}

export async function resolveProjectForkTrail<TProject extends ProjectForkTrailProject>(
  currentProject: TProject,
  getProjectById: ProjectForkTrailProjectResolver<TProject>,
  maxDepth = PROJECT_FORK_MAX_EDGES,
): Promise<ProjectForkTrail<TProject>> {
  const edges: Array<{
    childProject: TProject
    forkSource: ProjectForkSource
    parentProject: TProject | null
  }> = []
  const seenProjectIds = new Set<string>([currentProject.id])
  let childProject = currentProject
  let missingSourceProjectId: string | undefined
  let cycleDetected = false
  let truncated = false

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const forkSource = projectForkSourceFromSubmissionFields(childProject)
    if (!forkSource) break

    if (seenProjectIds.has(forkSource.sourceProjectId)) {
      cycleDetected = true
      break
    }

    const parentProject = await getProjectById(forkSource.sourceProjectId)
    if (!parentProject) missingSourceProjectId = forkSource.sourceProjectId

    edges.push({ childProject, forkSource, parentProject })
    if (!parentProject) break

    seenProjectIds.add(parentProject.id)
    childProject = parentProject

    if (depth === maxDepth - 1 && projectForkSourceFromSubmissionFields(parentProject)) {
      truncated = true
    }
  }

  if (edges.length === 0) {
    return {
      nodes: [],
      immediateSourceProject: null,
      cycleDetected,
      truncated,
    }
  }

  const orderedEdges = [...edges].reverse()
  const rootEdge = orderedEdges[0]
  const rootProject = rootEdge.parentProject
  const rootId = rootProject?.id ?? rootEdge.forkSource.sourceProjectId
  const rootTitle = rootProject?.title ?? rootEdge.forkSource.sourceProjectTitle ?? 'Source project'
  const nodes: ProjectForkTrailNode[] = [{
    id: rootId,
    title: rootTitle,
    isCurrent: rootId === currentProject.id,
    isMissingSource: !rootProject,
  }]

  for (const edge of orderedEdges) {
    nodes.push({
      id: edge.childProject.id,
      title: edge.childProject.title,
      forkSource: edge.forkSource,
      isCurrent: edge.childProject.id === currentProject.id,
      isMissingSource: false,
    })
  }

  return {
    nodes,
    immediateSourceProject: edges[0]?.parentProject ?? null,
    missingSourceProjectId,
    cycleDetected,
    truncated,
  }
}

export function serializeProjectForkSourceForNotes(source: ProjectForkSource) {
  const lines = [
    `Fork source project: ${source.sourceProjectTitle || source.sourceProjectId}`,
  ]

  if (source.sourceStepNumber || source.sourceStepId) {
    lines.push(`Fork point response: ${source.sourceStepNumber ? `step ${source.sourceStepNumber}` : source.sourceStepId}`)
  }
  if (source.sourceRunId) lines.push(`Fork source run: ${source.sourceRunId}`)
  if (source.sourceModelVariantId) lines.push(`Fork source model variant: ${source.sourceModelVariantId}`)
  if (source.sourceArtifactPath) lines.push(`Fork source artifact: ${source.sourceArtifactPath}`)
  if (source.sourceArtifactSha256) lines.push(`Fork source artifact SHA-256: ${source.sourceArtifactSha256}`)
  if (source.parentForkId) lines.push(`Parent fork: ${source.parentForkId}`)
  if (source.promptFamilyId) lines.push(`Prompt family: ${source.promptFamilyId}`)
  if (source.depth > 0 || source.branchIndex > 0) {
    lines.push(`Fork coordinates: depth ${source.depth}, branch ${source.branchIndex}`)
  }

  return lines.join('\n')
}
