import { getPromptModelLabel } from './prompt-comparisons'
import { projectForkSourceFromSubmissionFields } from './project-forks'
import { getProjectModelProfileSummary } from './project-model-profile-summaries'
import { getPreparedProjectModelIdentity } from './prepared-project-model-identities'
import { getPreparedShowcaseProjectById } from './prepared-showcase-projects'
import {
  getProjectModelVariantKnownIssueExplanation,
  getProjectModelVariantSet,
} from './project-model-variants'
import { getPublicModelIdentityLabel } from './public-model-labels'
import {
  resolvePublicSourceEvidence,
  type PublicEvidenceTruth,
} from './public-source-evidence'
import {
  publicArtifactStatusPresentation,
  type PublicArtifactStatus,
} from './public-project-truth'
import type { Profile, PromptWithRelations } from './types'

export { profileAvatarClasses, profileMonogram } from './profile-visuals'

export type ProfileProvenance = {
  label: string
  description: string
  tone: 'team' | 'source-run'
}

export type ProfileFocus = {
  label: string
  count: number
}

export type PublicProfileInsights = {
  originalCount: number
  publishedCount: number
  forkCount: number
  distinctModelCount: number
  verifiedModelRunCount: number
  comparisonProjectCount: number
  totalUpvotes: number
  totalSavesReceived: number
  categoryFocus: ProfileFocus[]
  modelFocus: ProfileFocus[]
  forks: PromptWithRelations[]
  projectEvidence: PublicProfileProjectEvidence[]
}

export type PublicProfileProjectEvidence = {
  projectId: string
  promptCount: number
  modelLabels: string[]
  defaultModelLabel: string
  defaultSourceAccessLabel: string
  defaultRecordLabel: PublicEvidenceTruth['recordLabel']
  defaultModelProofLabel: string
  verifiedModelRunCount: number
  currentModelRunCount: number
  modelRunCount: number
  knownIssueRunCount: number
  knownIssueExplanations: string[]
  hasModelHistory: boolean
  artifactStatus: PublicArtifactStatus
  artifactStatusLabel: 'Artifact verified' | 'Artifact has known issue' | 'Run recorded'
  artifactStatusExplanation: string | null
  artifactPath: string | null
  hasWorkingArtifact: boolean
  outcome: string | null
  forkSource: ReturnType<typeof projectForkSourceFromSubmissionFields>
}

function rankedFocus(counts: Map<string, number>, limit = 3): ProfileFocus[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit)
}

function modelIdentityKey(label: string) {
  return label
    .trim()
    .toLocaleLowerCase()
    .replace(/^(?:anthropic|claude|openai|chatgpt|google)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function distinctModelLabels(labels: string[]) {
  const byIdentity = new Map<string, string>()
  for (const label of labels) {
    const trimmed = label.trim()
    if (!trimmed) continue
    const identity = modelIdentityKey(trimmed)
    if (!byIdentity.has(identity)) byIdentity.set(identity, trimmed)
  }
  return [...byIdentity.values()]
}

function profileModelLabel(label: string) {
  const trimmed = label.trim()
  return getPublicModelIdentityLabel({ model: trimmed }) || trimmed
}

function lastProjectOutcome(project: PromptWithRelations) {
  const topLevelOutcome = project.result_content?.trim()
  if (topLevelOutcome) return topLevelOutcome

  const orderedSteps = [...(project.steps ?? [])].sort((left, right) => (
    right.step_number - left.step_number
  ))
  return orderedSteps.find((step) => step.result_content?.trim())?.result_content?.trim() ?? null
}

export function getPublicProfileProjectEvidence(
  project: PromptWithRelations,
): PublicProfileProjectEvidence {
  const verifiedRuns = getProjectModelProfileSummary(project.id)
  const preparedProject = getPreparedShowcaseProjectById(project.id)
  const variantSet = getProjectModelVariantSet(project.id)
  const defaultVariant = variantSet?.variants.find((variant) => (
    variant.sourceRunId === variantSet.defaultSourceRunId
  ))
  const projectedIdentity = getPreparedProjectModelIdentity(project.id)
  const fallbackDefaultModelLabel = projectedIdentity?.publicLabel
    ?? profileModelLabel(getPromptModelLabel(project))
  const defaultModelLabel = defaultVariant
    ? getPublicModelIdentityLabel({
        provider: defaultVariant.serviceLabel,
        model: defaultVariant.modelLabel,
        modelSettings: defaultVariant.modelSettings,
      })
    : fallbackDefaultModelLabel
  const defaultSourceEvidence = resolvePublicSourceEvidence({
    sourceRunId: defaultVariant?.sourceRunId ?? preparedProject?.sourceRunId,
    pathforgeRecordChecked: Boolean(defaultVariant || preparedProject),
  })
  const modelLabels = distinctModelLabels([
    ...(variantSet?.variants.map((variant) => getPublicModelIdentityLabel({
      provider: variant.serviceLabel,
      model: variant.modelLabel,
      modelSettings: variant.modelSettings,
    })) ?? []),
    ...verifiedRuns.map((run) => run.publicModelLabel),
    ...(fallbackDefaultModelLabel === 'Unknown model' ? [] : [fallbackDefaultModelLabel]),
  ])
  const currentModelRunCount = verifiedRuns.filter((run) => run.isCurrent).length
  const artifactPath = defaultVariant?.finalArtifactPath?.trim()
    ? `/${defaultVariant.finalArtifactPath.replace(/^public\//, '')}`
    : preparedProject?.artifactPath?.trim() || null
  const artifact = publicArtifactStatusPresentation({
    qualityStatus: defaultVariant?.qualityStatus ?? 'recorded',
    knownIssueExplanation: defaultVariant
      ? getProjectModelVariantKnownIssueExplanation(defaultVariant)
      : null,
  })
  const knownIssueExplanations = variantSet?.variants
    .filter((variant) => variant.qualityStatus === 'known-issue')
    .map((variant) => getProjectModelVariantKnownIssueExplanation(variant))
    .filter((explanation): explanation is string => Boolean(explanation))
    ?? []

  return {
    projectId: project.id,
    promptCount: Math.max(defaultVariant?.promptCount ?? preparedProject?.steps.length ?? project.prompt_step_count ?? project.steps?.length ?? 0, 1),
    modelLabels,
    defaultModelLabel,
    defaultSourceAccessLabel: defaultSourceEvidence.accessLabel,
    defaultRecordLabel: defaultSourceEvidence.recordLabel,
    defaultModelProofLabel: defaultSourceEvidence.modelProofLabel,
    verifiedModelRunCount: verifiedRuns.length,
    currentModelRunCount,
    modelRunCount: variantSet?.variants.length ?? 1,
    knownIssueRunCount: variantSet?.variants.filter((variant) => (
      variant.qualityStatus === 'known-issue'
    )).length ?? 0,
    knownIssueExplanations,
    hasModelHistory: verifiedRuns.some((run) => run.runRole === 'historical-baseline'),
    artifactStatus: artifact.status,
    artifactStatusLabel: artifact.label,
    artifactStatusExplanation: artifact.explanation,
    artifactPath,
    hasWorkingArtifact: Boolean(artifactPath),
    outcome: lastProjectOutcome(project),
    forkSource: projectForkSourceFromSubmissionFields(project),
  }
}

/**
 * Public provenance is intentionally conservative. We only render a badge when
 * the profile row itself carries a trustworthy signal. A normal user is never
 * inferred to be a seed account from their name, project category, or model.
 */
export function getProfileProvenance(profile: Profile): ProfileProvenance | null {
  const provenanceKind = profile.provenance?.kind

  if (provenanceKind === 'pathforge_team') {
    return {
      label: 'PathForge team',
      description: 'An official developer-operated PathForge account.',
      tone: 'team',
    }
  }

  if (provenanceKind === 'pathforge_seed') {
    return {
      label: 'PathForge-operated builder',
      description: 'Developer-operated source runs, clearly separated from community accounts.',
      tone: 'source-run',
    }
  }

  return null
}

export function derivePublicProfileInsights(
  projects: PromptWithRelations[],
): PublicProfileInsights {
  const categoryCounts = new Map<string, number>()
  const modelCounts = new Map<string, number>()
  const forks: PromptWithRelations[] = []
  const projectEvidence: PublicProfileProjectEvidence[] = []

  for (const project of projects) {
    if (project.category?.name) {
      const categoryLabel = `${project.category.icon ? `${project.category.icon} ` : ''}${project.category.name}`
      categoryCounts.set(categoryLabel, (categoryCounts.get(categoryLabel) ?? 0) + 1)
    }

    const evidence = getPublicProfileProjectEvidence(project)
    projectEvidence.push(evidence)
    for (const modelLabel of evidence.modelLabels) {
      modelCounts.set(modelLabel, (modelCounts.get(modelLabel) ?? 0) + 1)
    }

    if (evidence.forkSource) forks.push(project)
  }

  return {
    originalCount: projects.length - forks.length,
    publishedCount: projects.length,
    forkCount: forks.length,
    distinctModelCount: modelCounts.size,
    verifiedModelRunCount: projectEvidence.reduce((total, evidence) => (
      total + evidence.verifiedModelRunCount
    ), 0),
    comparisonProjectCount: projectEvidence.filter((evidence) => evidence.modelLabels.length > 1).length,
    totalUpvotes: projects.reduce((total, project) => total + project.vote_count, 0),
    totalSavesReceived: projects.reduce((total, project) => total + project.bookmark_count, 0),
    categoryFocus: rankedFocus(categoryCounts),
    modelFocus: rankedFocus(modelCounts),
    forks,
    projectEvidence,
  }
}
