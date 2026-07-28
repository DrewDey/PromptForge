import type { PromptWithRelations } from './types'
import type { PublicEvidenceTruth } from './public-source-evidence'

export const PROJECT_FORK_MAX_DEPTH = 10
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
  artifactPath?: string | null
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
}

export type ProjectForkArtifactVersion = {
  id: string
  artifactPath: string
  artifactTitle: string
  artifactSha256?: string
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

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

function clampForkLimit(value: number, max: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, Math.trunc(value)))
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
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
    depth: clampForkLimit(source.depth ?? 0, PROJECT_FORK_MAX_DEPTH - 1),
    branchIndex: clampForkLimit(source.branchIndex ?? 0, PROJECT_FORK_MAX_WIDTH - 1),
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
  if (nextDepth >= PROJECT_FORK_MAX_DEPTH) return null
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
  maxDepth = PROJECT_FORK_MAX_DEPTH,
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
