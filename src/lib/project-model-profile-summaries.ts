import rawSummaries from './project-model-profile-summaries.json'
import { getPublicModelIdentityLabel } from './public-model-labels'

export type ProjectModelProfileRunSummary = {
  serviceLabel: string
  modelLabel: string
  modelSettings: string
  isCurrent: boolean
  runRole: 'historical-baseline' | 'comparison-run'
  capturedAt: string
}

export type PublicProjectModelProfileRunSummary = ProjectModelProfileRunSummary & {
  publicModelLabel: string
}

const summaries = rawSummaries as Record<string, ProjectModelProfileRunSummary[]>

/**
 * A display-only projection of the validated model-variant manifests.
 * The model-variant guard checks this projection against the source manifests,
 * so profile pages do not need to hydrate packages, artifacts, or Node fs code.
 */
export function getProjectModelProfileSummary(
  projectId: string,
): PublicProjectModelProfileRunSummary[] {
  return (summaries[projectId] ?? []).map((run) => ({
    ...run,
    publicModelLabel: getPublicModelIdentityLabel({
      provider: run.serviceLabel,
      model: run.modelLabel,
      modelSettings: run.modelSettings,
    }),
  }))
}
