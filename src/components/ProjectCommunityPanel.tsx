import { MessageSquare } from 'lucide-react'
import ProjectForkBuildPath from '@/components/ProjectForkBuildPath'
import ProjectForkNetworkExplorer from '@/components/ProjectForkNetworkExplorer'
import { getApprovedProjectForks, getPromptById } from '@/lib/data'
import { getPreparedProjectModelIdentity } from '@/lib/prepared-project-model-identities'
import { getProjectRouteOverride } from '@/lib/project-links'
import { getPublicModelIdentityLabel } from '@/lib/public-model-labels'
import {
  buildProjectResponseForkHref,
  communityProjectContinuationSteps,
  projectForkSourceFromSubmissionFields,
  resolveProjectForkTrail,
  toProjectForkSourceSteps,
  type ProjectForkNetworkItem,
  type ProjectForkLineageTruth,
} from '@/lib/project-forks'
import type { PromptWithRelations } from '@/lib/types'

function projectHref(projectId: string) {
  return getProjectRouteOverride(projectId) ?? `/prompt/${projectId}`
}

function sourceProjectHref(projectId: string, sourceRunId?: string) {
  const href = projectHref(projectId)
  if (!sourceRunId) return href
  return `${href}?${new URLSearchParams({ run: sourceRunId }).toString()}`
}

function projectModelIdentity(
  projectId: string,
  fallbackModel?: string | null,
  fallbackProvider?: string | null,
) {
  const preparedIdentity = getPreparedProjectModelIdentity(projectId)
  if (preparedIdentity) return preparedIdentity.publicLabel

  return getPublicModelIdentityLabel({
    provider: fallbackProvider,
    model: fallbackModel,
  })
}

export default async function ProjectCommunityPanel({
  projectId,
  project: suppliedProject,
  lineageTruth,
  showForkLineage = true,
}: {
  projectId: string
  project?: PromptWithRelations
  lineageTruth?: ProjectForkLineageTruth | null
  showForkLineage?: boolean
}) {
  const project = suppliedProject ?? await getPromptById(projectId)
  const currentSteps = project ? toProjectForkSourceSteps(project) : []
  const forkSource = project ? projectForkSourceFromSubmissionFields(project) : null
  const forkTrail = showForkLineage && project && forkSource && lineageTruth === undefined
    ? await resolveProjectForkTrail(project, getPromptById)
    : null
  const immediateSourceGeneration = lineageTruth?.generations.at(-2) ?? null
  const sourceProject = forkTrail?.immediateSourceProject ?? null
  const sourceSteps = immediateSourceGeneration
    ? immediateSourceGeneration.presentation.localSteps
    : sourceProject
      ? toProjectForkSourceSteps(sourceProject)
      : []
  const continuationSourceSteps = forkSource
    ? communityProjectContinuationSteps(currentSteps)
    : []
  const continuationSteps = continuationSourceSteps.map((step, index) => (
    index === continuationSourceSteps.length - 1 &&
      project &&
      forkSource &&
      (lineageTruth === undefined || lineageTruth?.eligibility.allowed === true)
      ? {
          ...step,
          forkHref: buildProjectResponseForkHref({
            sourceProjectId: project.id,
            sourceProjectTitle: project.title,
            sourceStepId: step.id,
            sourceStepNumber: step.stepNumber,
            currentForkSource: forkSource,
            promptFamilyId: forkSource.promptFamilyId,
            destination: '/build',
          }),
        }
      : step
  ))
  const branch: ProjectForkNetworkItem | null = project && forkSource
    ? {
      id: project.id,
      title: project.title,
      description: project.description,
      authorUsername: project.author?.username ?? null,
      authorDisplayName: project.author?.display_name ?? null,
      modelUsed: projectModelIdentity(project.id, project.model_used),
      createdAt: project.created_at,
      forkSource,
      continuationSteps,
      childRoute: projectHref(project.id),
    }
    : null
  const approvedForks = showForkLineage && project && !forkSource
    ? (await getApprovedProjectForks(project.id)).map((fork) => ({
        ...fork,
        modelUsed: fork.modelUsed
          ? projectModelIdentity(fork.id, fork.modelUsed, fork.childProviderName)
          : fork.modelUsed,
      }))
    : []

  return (
    <section
      className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8 lg:pb-14"
      data-project-id={projectId}
    >
      {showForkLineage && branch && sourceSteps.length > 0 && (
        <div className="mb-10">
          <ProjectForkBuildPath
            mode="child"
            sourceSteps={sourceSteps}
            forkSource={forkSource ?? undefined}
            branch={branch}
            trail={lineageTruth
              ? lineageTruth.generations.map((generation) => ({
                  id: generation.projectId,
                  title: generation.title,
                  href: generation.presentation.href,
                  isCurrent: generation.isCurrent,
                }))
              : (forkTrail?.nodes ?? []).map((node) => ({
                  id: node.id,
                  title: node.title,
                  href: node.isMissingSource ? null : projectHref(node.id),
                  isCurrent: node.isCurrent,
                }))}
            sourceProjectHref={sourceProjectHref(
              forkSource?.sourceProjectId ?? '',
              forkSource?.sourceRunId,
            )}
            branchHref={projectHref(projectId)}
          />
        </div>
      )}

      {showForkLineage && !forkSource && currentSteps.length > 0 && (
        <ProjectForkNetworkExplorer sourceSteps={currentSteps} forks={approvedForks} />
      )}

      <div className="border-t border-surface-200 pt-10">
        <div className="mb-5 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-blue" aria-hidden="true" />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
              Discussion
            </div>
            <h2 className="text-2xl font-black text-surface-900">Comments and replies</h2>
          </div>
        </div>

        <div className="border border-dashed border-surface-300 bg-white px-4 py-6 text-sm text-surface-500">
          No comments yet.
        </div>
      </div>
    </section>
  )
}
