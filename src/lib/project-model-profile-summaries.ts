import rawSummaries from './project-model-profile-summaries.json'

export type ProjectModelProfileRunSummary = {
  modelLabel: string
  isCurrent: boolean
  runRole: 'historical-baseline' | 'comparison-run'
  capturedAt: string
}

const summaries = rawSummaries as Record<string, ProjectModelProfileRunSummary[]>

/**
 * A display-only projection of the validated model-variant manifests.
 * The model-variant guard checks this projection against the source manifests,
 * so profile pages do not need to hydrate packages, artifacts, or Node fs code.
 */
export function getProjectModelProfileSummary(projectId: string) {
  return summaries[projectId] ?? []
}
