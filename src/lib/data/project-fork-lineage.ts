import 'server-only'

import {
  buildProjectForkLineageTruth,
  chunkProjectForkLineageIds,
  normalizeProjectForkSource,
  selectProjectForkLineageTruth,
  unavailableProjectForkLineageTruth,
  type BuildProjectForkLineageTruthInput,
  type ProjectForkArtifactVersion,
  type ProjectForkContinuationStep,
  type ProjectForkLineageCandidateNode,
  type ProjectForkLineageIntegrityKind,
  type ProjectForkLineageIssue,
  type ProjectForkLineageTruth,
} from '../project-forks'
import {
  SUPABASE_PUBLIC_READS_ENABLED,
  SUPABASE_READ_TIMEOUT_MS,
} from './shared'

export type AuthoritativeProjectForkProject = {
  id: string
  title: string
  description: string | null
  modelUsed: string | null
  status: 'approved'
}

type RpcArtifact = {
  id?: unknown
  artifact_path?: unknown
  artifact_title?: unknown
  artifact_sha256?: unknown
  model_variant_id?: unknown
  source_run_id?: unknown
  source_step_id?: unknown
  source_step_number?: unknown
  is_default?: unknown
}

type RpcStep = {
  id?: unknown
  step_number?: unknown
  title?: unknown
  content?: unknown
  result_content?: unknown
  response_label?: unknown
  response_disclosure?: unknown
  artifacts?: unknown
}

type RpcNode = {
  project_id?: unknown
  title?: unknown
  description?: unknown
  model_used?: unknown
  provider_name?: unknown
  presentation_model_label?: unknown
  presentation_source_run_id?: unknown
  fork_source_project_id?: unknown
  fork_source_project_title?: unknown
  fork_source_model_variant_id?: unknown
  fork_source_run_id?: unknown
  fork_source_step_id?: unknown
  fork_source_step_number?: unknown
  fork_source_artifact_path?: unknown
  fork_source_artifact_sha256?: unknown
  fork_parent_submission_id?: unknown
  prompt_family_id?: unknown
  fork_depth?: unknown
  fork_branch_index?: unknown
  steps?: unknown
}

type RpcLineagePayload = {
  status?: unknown
  affected_project_id?: unknown
  nodes?: unknown
}

type RpcBatchRow = {
  target_project_id?: unknown
  lineage?: unknown
}

export type CodeBackedProjectForkLineage<TProject> = Omit<
  BuildProjectForkLineageTruthInput<TProject>,
  'readSource'
>

export const PROJECT_FORK_LINEAGE_BATCH_LIMIT = 10
export const PROJECT_FORK_LINEAGE_REQUEST_LIMIT = 100

function optionalString(value: unknown) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function requiredString(value: unknown, field: string) {
  const normalized = optionalString(value)
  if (!normalized) throw new Error(`Fork lineage RPC omitted ${field}.`)
  return normalized
}

function optionalInteger(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined
  return value
}

function parseArtifacts(value: unknown): ProjectForkArtifactVersion[] {
  if (!Array.isArray(value)) return []
  return value.map((artifact, index) => {
    const row = artifact as RpcArtifact
    const artifactPath = requiredString(row.artifact_path, 'artifact path')
    return {
      id: optionalString(row.id) ?? `${artifactPath}:${index}`,
      artifactPath,
      sourceArtifactPath: artifactPath,
      artifactTitle: optionalString(row.artifact_title) ?? artifactPath.split('/').at(-1) ?? 'Artifact',
      artifactSha256: optionalString(row.artifact_sha256),
      sourceModelVariantId: optionalString(row.model_variant_id),
      sourceRunId: optionalString(row.source_run_id),
      sourceStepId: optionalString(row.source_step_id),
      sourceStepNumber: optionalInteger(row.source_step_number),
      isDefault: row.is_default === true,
    }
  })
}

function parseSteps(value: unknown): ProjectForkContinuationStep[] {
  if (!Array.isArray(value)) return []
  return value.map((step) => {
    const row = step as RpcStep
    const id = requiredString(row.id, 'step id')
    const stepNumber = optionalInteger(row.step_number)
    if (!stepNumber || stepNumber < 1) {
      throw new Error('Fork lineage RPC returned an invalid step number.')
    }
    const artifacts = parseArtifacts(row.artifacts)
    return {
      id,
      stepNumber,
      promptTitle: optionalString(row.title) ?? `Prompt ${stepNumber}`,
      promptText: requiredString(row.content, 'step prompt text'),
      responseText: typeof row.result_content === 'string' ? row.result_content : null,
      responseLabel: optionalString(row.response_label),
      responseDisclosure: optionalString(row.response_disclosure),
      responsePackageId: id,
      artifactPath: artifacts.find((artifact) => artifact.isDefault)?.artifactPath
        ?? artifacts.at(-1)?.artifactPath
        ?? null,
      artifactSha256: artifacts.find((artifact) => artifact.isDefault)?.artifactSha256
        ?? artifacts.at(-1)?.artifactSha256
        ?? null,
      artifactVersions: artifacts,
      forkHref: null,
    }
  }).sort((left, right) => left.stepNumber - right.stepNumber)
}

function parseNode(
  value: unknown,
): ProjectForkLineageCandidateNode<AuthoritativeProjectForkProject> {
  const row = value as RpcNode
  const projectId = requiredString(row.project_id, 'project id')
  const title = requiredString(row.title, 'project title')
  const sourceProjectId = optionalString(row.fork_source_project_id)
  const depth = optionalInteger(row.fork_depth)
  const branchIndex = optionalInteger(row.fork_branch_index)
  const forkSource = sourceProjectId
    ? normalizeProjectForkSource({
        sourceProjectId,
        sourceProjectTitle: optionalString(row.fork_source_project_title),
        sourceModelVariantId: optionalString(row.fork_source_model_variant_id),
        sourceRunId: optionalString(row.fork_source_run_id),
        sourceStepId: optionalString(row.fork_source_step_id),
        sourceStepNumber: optionalInteger(row.fork_source_step_number),
        sourceArtifactPath: optionalString(row.fork_source_artifact_path),
        sourceArtifactSha256: optionalString(row.fork_source_artifact_sha256),
        parentForkId: optionalString(row.fork_parent_submission_id),
        promptFamilyId: optionalString(row.prompt_family_id),
        depth: depth ?? 0,
        branchIndex: branchIndex ?? 0,
      })
    : null
  const presentationSourceRunId = optionalString(row.presentation_source_run_id)
  const href = presentationSourceRunId
    ? `/prompt/${projectId}?${new URLSearchParams({ run: presentationSourceRunId })}`
    : `/prompt/${projectId}`

  return {
    projectId,
    title,
    project: {
      id: projectId,
      title,
      description: optionalString(row.description) ?? null,
      modelUsed: optionalString(row.model_used) ?? null,
      status: 'approved',
    },
    presentation: {
      href,
      modelLabel: optionalString(row.presentation_model_label)
        ?? optionalString(row.model_used)
        ?? null,
      providerName: optionalString(row.provider_name) ?? null,
      localSteps: parseSteps(row.steps),
    },
    promptFamilyId: optionalString(row.prompt_family_id) ?? null,
    forkSource,
  }
}

const INTEGRITY_KINDS = new Set<ProjectForkLineageIntegrityKind>([
  'complete',
  'missing-parent',
  'cycle',
  'truncated',
  'unavailable',
  'invalid',
])

function integrityIssue(
  kind: ProjectForkLineageIntegrityKind,
  projectId?: string,
): ProjectForkLineageIssue[] {
  if (kind === 'complete' || kind === 'invalid') return []
  return [{
    kind,
    projectId,
  }]
}

export function adaptCodeBackedProjectForkLineage<TProject>(
  input: CodeBackedProjectForkLineage<TProject>,
): ProjectForkLineageTruth<TProject> {
  return buildProjectForkLineageTruth({
    ...input,
    readSource: 'code-backed',
  })
}

function parseRpcLineage(
  projectId: string,
  payload: RpcLineagePayload | null,
) {
  const status = optionalString(payload?.status)
  if (!status || !INTEGRITY_KINDS.has(status as ProjectForkLineageIntegrityKind)) {
    throw new Error('Fork lineage RPC returned an unknown integrity status.')
  }
  const kind = status as ProjectForkLineageIntegrityKind
  const affectedProjectId = optionalString(payload?.affected_project_id)
  if (!Array.isArray(payload?.nodes)) {
    throw new Error('Fork lineage RPC omitted its bounded node array.')
  }
  const nodes = payload.nodes.map(parseNode)

  return buildProjectForkLineageTruth({
    nodes,
    currentProjectId: projectId,
    readSource: 'database-rpc',
    integrity: {
      kind,
      affectedProjectId,
      issues: integrityIssue(kind, affectedProjectId),
    },
  })
}

export async function getAuthoritativeProjectForkLineages<TCodeProject = never>(
  projectIds: string[],
  options: {
    codeBacked?: ReadonlyMap<string, CodeBackedProjectForkLineage<TCodeProject>>
    codeBackedAuthorityIds?: ReadonlySet<string>
  } = {},
): Promise<Map<
  string,
  ProjectForkLineageTruth<AuthoritativeProjectForkProject | TCodeProject>
>> {
  const uniqueProjectIds = [...new Set(projectIds.map((id) => id.trim()).filter(Boolean))]
  if (uniqueProjectIds.length > PROJECT_FORK_LINEAGE_REQUEST_LIMIT) {
    throw new Error(
      `Fork lineage request exceeds ${PROJECT_FORK_LINEAGE_REQUEST_LIMIT} project IDs.`,
    )
  }

  const truths = new Map<
    string,
    ProjectForkLineageTruth<AuthoritativeProjectForkProject | TCodeProject>
  >()
  for (const projectId of uniqueProjectIds) {
    const codeBacked = options.codeBacked?.get(projectId)
    if (codeBacked && options.codeBackedAuthorityIds?.has(projectId)) {
      truths.set(projectId, adaptCodeBackedProjectForkLineage(codeBacked))
    }
  }

  const databaseProjectIds = uniqueProjectIds.filter((id) => !truths.has(id))
  if (databaseProjectIds.length === 0) return truths
  if (!SUPABASE_PUBLIC_READS_ENABLED) {
    for (const projectId of databaseProjectIds) {
      truths.set(
        projectId,
        unavailableProjectForkLineageTruth(projectId, {
          expected: 'configured-authoritative-lineage-rpc',
          observed: 'supabase-public-reads-disabled',
        }),
      )
    }
    return truths
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SUPABASE_READ_TIMEOUT_MS)
  try {
    const { createPublicReadClient } = await import('../supabase/server')
    const supabase = await createPublicReadClient({ anonymous: true })
    const batches = chunkProjectForkLineageIds(
      databaseProjectIds,
      PROJECT_FORK_LINEAGE_BATCH_LIMIT,
    )
    const batchRows = await Promise.all(batches.map(async (batch) => {
      const { data } = await supabase
        .rpc('read_public_project_fork_lineages', {
          target_projects: batch,
        })
        .retry(false)
        .abortSignal(controller.signal)
        .throwOnError()
      if (!Array.isArray(data)) {
        throw new Error('Fork lineage batch RPC omitted its result rows.')
      }
      return data
    }))
    const expected = new Set(databaseProjectIds)
    for (const value of batchRows.flat()) {
      const row = value as RpcBatchRow
      const projectId = requiredString(row.target_project_id, 'target project id')
      if (!expected.delete(projectId) || truths.has(projectId)) {
        throw new Error('Fork lineage batch RPC returned an unknown or duplicate project.')
      }
      const databaseTruth = parseRpcLineage(
        projectId,
        row.lineage as RpcLineagePayload | null,
      )
      const codeBacked = options.codeBacked?.get(projectId)
      const codeBackedTruth = codeBacked
        ? adaptCodeBackedProjectForkLineage(codeBacked)
        : null
      truths.set(projectId, selectProjectForkLineageTruth<
        AuthoritativeProjectForkProject | TCodeProject
      >({
        databaseTruth,
        codeBackedTruth,
      })!)
    }
    if (expected.size > 0) {
      throw new Error('Fork lineage batch RPC omitted a requested project.')
    }
  } catch (error) {
    for (const projectId of databaseProjectIds) {
      truths.set(
        projectId,
        unavailableProjectForkLineageTruth(projectId, {
          expected: 'successful-authoritative-lineage-rpc',
          observed: error instanceof Error ? error.name : 'unknown-read-failure',
        }),
      )
    }
  } finally {
    clearTimeout(timeout)
  }
  return truths
}

export async function getAuthoritativeProjectForkLineage(
  projectId: string,
): Promise<ProjectForkLineageTruth<AuthoritativeProjectForkProject>> {
  const truths = await getAuthoritativeProjectForkLineages([projectId])
  return truths.get(projectId)
    ?? unavailableProjectForkLineageTruth(projectId, {
      expected: 'one-authoritative-lineage-result',
      observed: 'missing-result',
    })
}
