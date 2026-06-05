import type { PromptWithRelations } from './types'

export const PROJECT_FORK_MAX_DEPTH = 10
export const PROJECT_FORK_MAX_WIDTH = 10

export const PROJECT_FORK_QUERY_KEYS = {
  sourceProjectId: 'fork',
  sourceProjectTitle: 'forkTitle',
  sourceStepId: 'forkStep',
  sourceStepNumber: 'forkStepNumber',
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
  responsePackageId: string
  artifactPath?: string | null
}

export type ProjectForkSource = {
  sourceProjectId: string
  sourceProjectTitle?: string
  sourceStepId?: string
  sourceStepNumber?: number
  parentForkId?: string
  depth: number
  branchIndex: number
  promptFamilyId?: string
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
    sourceStepId: normalizeOptional(source.sourceStepId),
    sourceStepNumber: source.sourceStepNumber && source.sourceStepNumber > 0
      ? Math.trunc(source.sourceStepNumber)
      : undefined,
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
    sourceStepId: params.get(PROJECT_FORK_QUERY_KEYS.sourceStepId) ?? undefined,
    sourceStepNumber: parsePositiveInteger(params.get(PROJECT_FORK_QUERY_KEYS.sourceStepNumber), 0) || undefined,
    parentForkId: params.get(PROJECT_FORK_QUERY_KEYS.parentForkId) ?? undefined,
    depth: parsePositiveInteger(params.get(PROJECT_FORK_QUERY_KEYS.depth), 0),
    branchIndex: parsePositiveInteger(params.get(PROJECT_FORK_QUERY_KEYS.branchIndex), 0),
    promptFamilyId: params.get(PROJECT_FORK_QUERY_KEYS.promptFamilyId) ?? undefined,
  })
}

export function buildProjectForkHref(source: Partial<ProjectForkSource> & { sourceProjectId: string }) {
  const normalized = normalizeProjectForkSource(source)
  const params = new URLSearchParams({ [PROJECT_FORK_QUERY_KEYS.sourceProjectId]: normalized.sourceProjectId })

  if (normalized.sourceProjectTitle) {
    params.set(PROJECT_FORK_QUERY_KEYS.sourceProjectTitle, normalized.sourceProjectTitle)
  }
  if (normalized.sourceStepId) params.set(PROJECT_FORK_QUERY_KEYS.sourceStepId, normalized.sourceStepId)
  if (normalized.sourceStepNumber) {
    params.set(PROJECT_FORK_QUERY_KEYS.sourceStepNumber, String(normalized.sourceStepNumber))
  }
  if (normalized.parentForkId) params.set(PROJECT_FORK_QUERY_KEYS.parentForkId, normalized.parentForkId)
  if (normalized.depth > 0) params.set(PROJECT_FORK_QUERY_KEYS.depth, String(normalized.depth))
  if (normalized.branchIndex > 0) params.set(PROJECT_FORK_QUERY_KEYS.branchIndex, String(normalized.branchIndex))
  if (normalized.promptFamilyId) params.set(PROJECT_FORK_QUERY_KEYS.promptFamilyId, normalized.promptFamilyId)

  return `/build?${params.toString()}`
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

export function resolveProjectForkPoint(
  sourceSteps: ProjectForkSourceStep[],
  source: Pick<ProjectForkSource, 'sourceStepId' | 'sourceStepNumber'>,
) {
  if (source.sourceStepId) {
    const match = sourceSteps.find((step) => step.id === source.sourceStepId)
    if (match) return match
  }

  if (source.sourceStepNumber) {
    const match = sourceSteps.find((step) => step.stepNumber === source.sourceStepNumber)
    if (match) return match
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

export function serializeProjectForkSourceForNotes(source: ProjectForkSource) {
  const lines = [
    `Fork source project: ${source.sourceProjectTitle || source.sourceProjectId}`,
  ]

  if (source.sourceStepNumber || source.sourceStepId) {
    lines.push(`Fork point response: ${source.sourceStepNumber ? `step ${source.sourceStepNumber}` : source.sourceStepId}`)
  }
  if (source.parentForkId) lines.push(`Parent fork: ${source.parentForkId}`)
  if (source.promptFamilyId) lines.push(`Prompt family: ${source.promptFamilyId}`)
  if (source.depth > 0 || source.branchIndex > 0) {
    lines.push(`Fork coordinates: depth ${source.depth}, branch ${source.branchIndex}`)
  }

  return lines.join('\n')
}
