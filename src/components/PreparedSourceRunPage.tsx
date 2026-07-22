import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { BuilderByline } from '@/components/BuilderByline'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import PathForgeLabsModelRuns, {
  PathForgeLabsModelComparison,
} from '@/components/PathForgeLabsModelRuns'
import SourceRunShowcase, {
  type SourceRunShowcaseForkContext,
  type SourceRunShowcaseArtifactVersion,
  type SourceRunShowcaseStep,
} from '@/components/SourceRunShowcase'
import ProjectActivationTracker from '@/components/analytics/ProjectActivationTracker'
import { PublicTruthSummary } from '@/components/PublicTruthSummary'
import { getApprovedProjectForks } from '@/lib/data'
import { getPublicProfileByUsername } from '@/lib/data/public-profiles'
import {
  getPreparedShowcaseProjectById,
  resolvePreparedShowcaseLineage,
  type PreparedShowcaseProject,
} from '@/lib/prepared-showcase-projects'
import { getProjectRouteOverride } from '@/lib/project-links'
import type {
  ProjectForkContinuationStep,
  ProjectForkNetworkItem,
  ProjectForkSource,
  ProjectForkSourceStep,
} from '@/lib/project-forks'
import { buildProjectResponseForkHref } from '@/lib/project-forks'
import { getCurrentUserProjectContext } from '@/lib/data/my-forge'
import type {
  ProjectModelVariant,
  ProjectModelVariantSet,
} from '@/lib/project-model-variants'
import {
  getProjectModelVariantKnownIssueExplanation,
  getProjectModelVariantSet,
} from '@/lib/project-model-variants'
import { derivePublicProjectTruth } from '@/lib/public-project-truth'
import { getCanonicalPreparedSelectedRunPromptCount } from '@/lib/prompt-public-truth'
import { getPublicModelIdentityLabel } from '@/lib/public-model-labels'
import type { SourceRunPackage, SourceRunPackageStep } from '@/lib/source-run-package'
import { loadSourceRunPackage } from '@/lib/source-run-package'

function getPublicArtifactPath(artifactPath?: string | null) {
  if (!artifactPath?.startsWith('public/artifacts/')) return null
  return `/${artifactPath.replace(/^public\//, '')}`
}

function artifactSha256(artifactPath: string) {
  if (!artifactPath.startsWith('public/artifacts/')) return undefined
  const relativeArtifactPath = artifactPath.replace(/^public\/artifacts\//, '')
  if (
    !relativeArtifactPath ||
    relativeArtifactPath.includes('\\') ||
    relativeArtifactPath.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')
  ) return undefined
  try {
    return createHash('sha256')
      .update(readFileSync(/* turbopackIgnore: true */ path.join(
        /* turbopackIgnore: true */ process.cwd(),
        'public',
        'artifacts',
        relativeArtifactPath,
      )))
      .digest('hex')
  } catch {
    return undefined
  }
}

function getProviderName(sourceRun: SourceRunPackage, project: PreparedShowcaseProject) {
  const provider = sourceRun.provider?.trim()
  if (provider?.toLowerCase() === 'chatgpt') return 'ChatGPT'
  if (provider) return provider
  if (project.modelUsed.toLowerCase().includes('gemini')) return 'Gemini'
  if (project.modelUsed.toLowerCase().includes('claude')) return 'Claude'
  return 'AI'
}

function sourceRunModelIdentity(
  sourceRun: SourceRunPackage,
  project: PreparedShowcaseProject,
) {
  return getPublicModelIdentityLabel({
    provider: sourceRun.provider,
    model: sourceRun.model ?? project.modelUsed,
    modelSettings: sourceRun.model_settings,
  })
}

function defaultStepNumber(sourceRun: SourceRunPackage) {
  const finalPath = sourceRun.final_artifact_path
  const defaultStep = sourceRun.steps.find((step) => (
    step.artifact_version_path === finalPath ||
    step.generated_files?.includes(finalPath ?? '')
  ))
  return defaultStep?.step_number ?? sourceRun.steps[sourceRun.steps.length - 1]?.step_number
}

function artifactTitle(project: PreparedShowcaseProject, step: SourceRunPackageStep, finalArtifactPath?: string) {
  const isDefault =
    step.artifact_version_path === finalArtifactPath ||
    step.generated_files?.includes(finalArtifactPath ?? '')

  if (isDefault) return `${project.title} final`
  return `${project.title} step ${step.step_number}`
}

function artifactVersionsForStep(
  step: SourceRunPackageStep,
  project: PreparedShowcaseProject,
  finalArtifactPath?: string,
  includeFinalArtifact = false,
): SourceRunShowcaseArtifactVersion[] {
  const files = new Set<string>()
  if (step.artifact_version_path?.startsWith('public/artifacts/')) files.add(step.artifact_version_path)
  for (const filePath of step.generated_files ?? []) {
    if (filePath.startsWith('public/artifacts/')) files.add(filePath)
  }
  if (includeFinalArtifact && finalArtifactPath?.startsWith('public/artifacts/')) files.add(finalArtifactPath)

  return [...files].reduce<SourceRunShowcaseArtifactVersion[]>((versions, filePath, index) => {
      const publicArtifactPath = getPublicArtifactPath(filePath)
      if (!publicArtifactPath) return versions

      const isDefault = filePath === finalArtifactPath
      versions.push({
        id: `${project.id}-step-${step.step_number}-artifact-${index + 1}`,
        artifactPath: publicArtifactPath,
        artifactTitle: isDefault ? `${project.title} final` : `${project.title} step ${step.step_number}`,
        artifactSha256: step.artifact_version_path === filePath && step.artifact_sha256
          ? step.artifact_sha256
          : artifactSha256(filePath),
        isDefault,
      })

      return versions
    }, [])
}

function toShowcaseStep(
  step: SourceRunPackageStep,
  sourceRun: SourceRunPackage,
  project: PreparedShowcaseProject,
  stepIdentityScope?: string,
): SourceRunShowcaseStep {
  const projectStep = project.steps.find((item) => item.stepNumber === step.step_number)
  const finalStepNumber = defaultStepNumber(sourceRun)
  const artifactVersions = artifactVersionsForStep(
    step,
    project,
    sourceRun.final_artifact_path,
    step.step_number === finalStepNumber,
  )
  const primaryArtifact =
    artifactVersions.find((version) => version.isDefault) ??
    artifactVersions[artifactVersions.length - 1]
  const isDefault =
    step.artifact_version_path === sourceRun.final_artifact_path ||
    step.generated_files?.includes(sourceRun.final_artifact_path ?? '')

  return {
    id: stepIdentityScope
      ? `${project.id}:${stepIdentityScope}:step:${step.step_number}`
      : `${project.id}-step-${step.step_number}`,
    stepNumber: step.step_number,
    title: projectStep?.title ?? `Prompt ${step.step_number}`,
    prompt: step.prompt_exact,
    response: step.response_exact,
    responseCopyText: step.response_exact,
    artifactPath: primaryArtifact?.artifactPath,
    artifactTitle: primaryArtifact?.artifactTitle ?? artifactTitle(project, step, sourceRun.final_artifact_path),
    artifactVersions,
    callout: primaryArtifact && isDefault
      ? {
          tone: 'success',
          title: 'Default approved artifact',
          body: 'This response package is the artifact mounted first on the public page.',
        }
      : undefined,
  }
}

function mainPathSourceSteps(
  sourceRun: SourceRunPackage,
  forkSource?: ProjectForkSource | null,
) {
  const forkPointStepNumber = forkSource?.sourceStepNumber
  if (!forkPointStepNumber) return sourceRun.steps

  const continuationSteps = sourceRun.steps.filter((step) => step.step_number > forkPointStepNumber)
  return continuationSteps.length > 0 ? continuationSteps : sourceRun.steps
}

function toForkSourceStep(step: SourceRunShowcaseStep): ProjectForkSourceStep {
  return {
    id: step.id,
    stepNumber: step.stepNumber,
    promptTitle: step.title,
    promptText: step.prompt,
    responseText: step.response,
    responsePackageId: step.id,
    artifactPath: step.artifactPath,
  }
}

function toForkContinuationStep(step: SourceRunShowcaseStep): ProjectForkContinuationStep {
  return {
    ...toForkSourceStep(step),
    artifactVersions: (step.artifactVersions ?? []).map((artifact, index) => ({
      id: artifact.id ?? `${step.id}:artifact:${index + 1}`,
      artifactPath: artifact.artifactPath,
      artifactTitle: artifact.artifactTitle,
      artifactSha256: artifact.artifactSha256,
      isDefault: artifact.isDefault,
    })),
  }
}

function withModelRun(href: string, sourceRunId?: string) {
  if (!sourceRunId) return href
  const query = new URLSearchParams({ run: sourceRunId })
  return `${href}?${query.toString()}`
}

function resolvePreparedSourcePackage(
  sourceProject: PreparedShowcaseProject,
  forkSource: ProjectForkSource,
) {
  if (forkSource.sourceRunId) {
    const variantSet = getProjectModelVariantSet(sourceProject.id)
    const sourceVariant = variantSet?.variants.find((variant) => (
      variant.sourceRunId === forkSource.sourceRunId
    ))
    if (sourceVariant) {
      return {
        sourcePackage: sourceVariant.sourceRunPackage,
        sourceStepScope: sourceVariant.sourceRunId,
      }
    }

    if (
      sourceProject.sourceRunPackageFile &&
      sourceProject.sourceRunId === forkSource.sourceRunId
    ) {
      const sourcePackage = loadSourceRunPackage(sourceProject.sourceRunPackageFile)
      return {
        sourcePackage,
        sourceStepScope: sourcePackage.source_run_id ?? sourceProject.sourceRunId,
      }
    }

    throw new Error(
      `Fork source run ${forkSource.sourceRunId} is not registered for ${sourceProject.id}.`,
    )
  }

  if (!sourceProject.sourceRunPackageFile) {
    throw new Error(`Fork source project ${sourceProject.id} has no registered source package.`)
  }
  const sourcePackage = loadSourceRunPackage(sourceProject.sourceRunPackageFile)
  return {
    sourcePackage,
    sourceStepScope: sourcePackage.source_run_id ?? sourceProject.sourceRunId,
  }
}

function buildPreparedForkContext({
  project,
  sourceRun,
  childSteps,
  forkSource,
  route,
  childArtifactQualityStatus,
  childArtifactKnownIssueExplanation,
}: {
  project: PreparedShowcaseProject
  sourceRun: SourceRunPackage
  childSteps: SourceRunShowcaseStep[]
  forkSource: ProjectForkSource
  route: string
  childArtifactQualityStatus: 'verified' | 'known-issue' | 'recorded'
  childArtifactKnownIssueExplanation: string | null
}): SourceRunShowcaseForkContext {
  const lineage = resolvePreparedShowcaseLineage(project)
  const registeredSource = getPreparedShowcaseProjectById(forkSource.sourceProjectId)
  const immediateSource = lineage[lineage.length - 2]
  if (!registeredSource || !immediateSource || immediateSource.id !== registeredSource.id) {
    throw new Error(`Fork source project ${forkSource.sourceProjectId} is not the registered parent.`)
  }

  const sourceSteps: ProjectForkSourceStep[] = []
  const trail: SourceRunShowcaseForkContext['trail'] = []
  const sourceStepIds = new Set<string>()

  for (let index = 0; index < lineage.length - 1; index += 1) {
    const sourceProject = lineage[index]
    const childProject = lineage[index + 1]
    const childForkSource = childProject.forkSource
    if (!childForkSource || childForkSource.sourceProjectId !== sourceProject.id) {
      throw new Error(`Prepared lineage link ${sourceProject.id} -> ${childProject.id} is invalid.`)
    }

    const { sourcePackage, sourceStepScope } = resolvePreparedSourcePackage(
      sourceProject,
      childForkSource,
    )
    const forkPointNumber = childForkSource.sourceStepNumber
    for (const step of mainPathSourceSteps(sourcePackage, sourceProject.forkSource)) {
      if (forkPointNumber && step.step_number > forkPointNumber) continue
      const preparedStep = toForkSourceStep(
        toShowcaseStep(step, sourcePackage, sourceProject, sourceStepScope),
      )
      if (sourceStepIds.has(preparedStep.id)) continue
      sourceStepIds.add(preparedStep.id)
      sourceSteps.push(preparedStep)
    }

    const sourceRoute = getProjectRouteOverride(sourceProject.id) ?? sourceProject.href
    trail.push({
      id: sourceProject.id,
      title: sourceProject.title,
      href: withModelRun(sourceRoute, childForkSource.sourceRunId),
      modelLabel: sourceRunModelIdentity(sourcePackage, sourceProject),
    })
  }

  trail.push({
    id: project.id,
    title: project.title,
    href: route,
    modelLabel: sourceRunModelIdentity(sourceRun, project),
    isCurrent: true,
  })

  const continuationSteps = childSteps.map((step) => {
    const continuation = toForkContinuationStep(step)
    const forkArtifact =
      continuation.artifactVersions?.find((artifact) => artifact.isDefault) ??
      null
    const nestedSourceRunId = sourceRun.source_run_id?.trim()
    const nestedArtifactPath = forkArtifact?.artifactPath
      ? `public${forkArtifact.artifactPath}`
      : null
    const hasPublishableFinalEvidence = Boolean(
      nestedSourceRunId &&
      Number.isInteger(sourceRun.prompt_count) &&
      sourceRun.prompt_count === continuation.stepNumber &&
      forkArtifact?.artifactSha256 &&
      nestedArtifactPath === sourceRun.final_artifact_path &&
      forkArtifact.artifactSha256 === sourceRun.artifact_sha256,
    )
    if (!hasPublishableFinalEvidence || !nestedSourceRunId || !nestedArtifactPath || !forkArtifact?.artifactSha256) {
      return continuation
    }

    return {
      ...continuation,
      forkHref: buildProjectResponseForkHref({
        sourceProjectId: project.id,
        sourceProjectTitle: project.title,
        sourceRunId: nestedSourceRunId,
        sourceStepId: continuation.id,
        sourceStepNumber: continuation.stepNumber,
        sourceArtifactPath: nestedArtifactPath,
        sourceArtifactSha256: forkArtifact.artifactSha256,
        currentForkSource: forkSource,
        promptFamilyId: forkSource.promptFamilyId,
      }),
    }
  })
  const newForkHref =
    continuationSteps.find((step) => step.forkHref)?.forkHref ??
    null

  const branch: ProjectForkNetworkItem = {
    id: project.id,
    title: project.title,
    description: project.description,
    authorUsername: project.authorUsername,
    authorDisplayName: project.authorDisplayName,
    modelUsed: sourceRunModelIdentity(sourceRun, project),
    createdAt: project.createdAt,
    forkSource,
    continuationSteps,
    childRoute: route,
    childSourceUrl: sourceRun.source_url ?? project.sourceUrl,
    childProviderName: sourceRun.provider ?? null,
    childArtifactQualityStatus,
    childArtifactKnownIssueExplanation,
  }
  const sourceRoute = getProjectRouteOverride(immediateSource.id) ?? immediateSource.href

  return {
    sourceSteps,
    branch,
    trail,
    sourceProjectHref: withModelRun(sourceRoute, forkSource.sourceRunId),
    sourceRunHref: sourceRun.source_url ?? project.sourceUrl,
    newForkHref,
  }
}

function RunSummary({
  sourceRun,
  project,
  capturedAt,
}: {
  sourceRun: SourceRunPackage
  project: PreparedShowcaseProject
  capturedAt: string
}) {
  const modelIdentity = sourceRunModelIdentity(sourceRun, project)

  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="border border-surface-200 bg-white px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model
        </div>
        <div className="mt-1 font-semibold text-surface-900" data-public-model-identity>
          {modelIdentity}
        </div>
      </div>
      <div className="border border-surface-200 bg-white px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Captured
        </div>
        <div className="mt-1 font-semibold text-surface-900">{capturedAt}</div>
      </div>
    </div>
  )
}

export default async function PreparedSourceRunPage({
  project,
  sourceRunPackage,
  route,
  capturedAt,
  modelVariantSet,
  activeModelVariant,
  compareModelVariant,
  modelVariantRegistryWarning,
  acknowledgeModelUpdates = false,
}: {
  project: PreparedShowcaseProject
  sourceRunPackage: SourceRunPackage
  route?: string
  capturedAt: string
  modelVariantSet?: ProjectModelVariantSet | null
  activeModelVariant?: ProjectModelVariant | null
  compareModelVariant?: ProjectModelVariant | null
  modelVariantRegistryWarning?: string
  acknowledgeModelUpdates?: boolean
}) {
  const sourceRun = sourceRunPackage
  const pageRoute = route ?? project.href
  const providerName = getProviderName(sourceRun, project)
  const sourceUrl = sourceRun.source_url || project.sourceUrl
  const usesModelVariants = Boolean(modelVariantSet && activeModelVariant)
  const stepIdentityScope = activeModelVariant?.sourceRunId
    ?? sourceRun.source_run_id
    ?? project.sourceRunId
  const forkSource = sourceRun.fork_source ?? project.forkSource ?? null
  const steps = mainPathSourceSteps(sourceRun, forkSource).map((step) => (
    toShowcaseStep(
      step,
      sourceRun,
      project,
      stepIdentityScope,
    )
  ))
  const forkNetwork = await getApprovedProjectForks(
    project.id,
    usesModelVariants ? activeModelVariant?.sourceRunId : undefined,
  )
  const forkContext = forkSource
    ? buildPreparedForkContext({
      project,
      sourceRun,
      childSteps: steps,
      forkSource,
      route: pageRoute,
      childArtifactQualityStatus: activeModelVariant?.qualityStatus ?? 'recorded',
      childArtifactKnownIssueExplanation: activeModelVariant
        ? getProjectModelVariantKnownIssueExplanation(activeModelVariant)
        : null,
    })
    : null
  const projectContext = await getCurrentUserProjectContext(project.id)
  const publicAuthorProfile = await getPublicProfileByUsername(project.authorUsername)
  const currentSourceRunId = activeModelVariant?.sourceRunId
    ?? sourceRun.source_run_id
    ?? project.sourceRunId
  const sourceRunSlug = (sourceRun as SourceRunPackage & { slug?: string }).slug
  const sourceEvidenceLookup = {
    sourceRunId: currentSourceRunId,
    ...(sourceRun.source_run_id === undefined
      ? {}
      : { source_run_id: sourceRun.source_run_id }),
    ...(sourceRun.source_run_submission_id === undefined
      ? {}
      : { source_run_submission_id: sourceRun.source_run_submission_id }),
    ...(sourceRun.pathforge_pending_id === undefined
      ? {}
      : { pathforge_pending_id: sourceRun.pathforge_pending_id }),
    ...(sourceRunSlug === undefined ? {} : { slug: sourceRunSlug }),
    pathforgeRecordChecked: true,
  }
  const publicTruth = derivePublicProjectTruth({
    sourceEvidenceLookup,
    qualityStatus: activeModelVariant?.qualityStatus ?? 'recorded',
    knownIssueExplanation: activeModelVariant
      ? getProjectModelVariantKnownIssueExplanation(activeModelVariant)
      : null,
    selectedRunPromptCount: getCanonicalPreparedSelectedRunPromptCount(
      project,
      activeModelVariant?.promptCount,
    ),
    familyRunCount: modelVariantSet?.variants.length ?? 1,
    isCanonicalDefaultRun: modelVariantSet
      ? currentSourceRunId === modelVariantSet.defaultSourceRunId
      : true,
  })
  const resumeArtifactPath = projectContext.state?.selectedSourceRunId === currentSourceRunId
    ? projectContext.state.selectedArtifactPath
    : null

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900">
      <ProjectActivationTracker
        projectId={project.id}
        projectTitle={project.title}
        sourceRunId={currentSourceRunId}
      />
      <section className="border-b border-surface-200 bg-white text-surface-900">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="font-mono text-xs uppercase tracking-[0.18em] text-surface-500 hover:text-brand-orange"
            >
              PathForge
            </Link>
          </div>

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="max-w-4xl text-3xl font-black leading-[0.96] tracking-normal sm:text-5xl">
                {project.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-600">
                {project.description}
              </p>
              <BuilderByline
                name={project.authorDisplayName || project.authorUsername}
                username={project.authorUsername}
                provenanceKind={publicAuthorProfile?.provenance?.kind}
                prefix="Built by"
                href={`/user/${project.authorUsername}`}
                showUsername
                className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs font-semibold text-surface-500 hover:text-brand-orange"
                provenanceClassName="text-surface-500"
              />
              <div
                data-prepared-header-public-truth
                data-source-run-id={currentSourceRunId}
                data-source-access={publicTruth.sourceEvidence.accessState}
                data-pathforge-record={publicTruth.sourceEvidence.hasPathForgeRecord ? 'true' : 'false'}
                data-model-proof={publicTruth.sourceEvidence.modelProof}
                data-selected-run-prompt-count={publicTruth.selectedRunPromptCount}
              >
                <PublicTruthSummary
                  truth={publicTruth}
                  showArtifactExplanation={!modelVariantSet}
                  className="mt-3 max-w-4xl"
                />
              </div>
            </div>
            {modelVariantSet && activeModelVariant ? (
              <PathForgeLabsModelRuns
                variantSet={modelVariantSet}
                activeVariant={activeModelVariant}
                compareSourceRunId={compareModelVariant?.sourceRunId}
              />
            ) : (
              <RunSummary sourceRun={sourceRun} project={project} capturedAt={capturedAt} />
            )}
          </div>

          <ProjectEngagementBar projectId={project.id} loginNextPath={pageRoute} />
        </div>
      </section>

      {modelVariantRegistryWarning && (
        <div
          className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-amber-900"
          role="status"
          data-model-variant-registry-warning
        >
          {modelVariantRegistryWarning}
        </div>
      )}

      {modelVariantSet && activeModelVariant && compareModelVariant && (
        <PathForgeLabsModelComparison
          variantSet={modelVariantSet}
          activeVariant={activeModelVariant}
          compareVariant={compareModelVariant}
        />
      )}

      <SourceRunShowcase
        key={activeModelVariant?.sourceRunId ?? project.sourceRunId}
        sourceRunUrl={sourceUrl}
        sourceEvidence={publicTruth.sourceEvidence}
        projectId={project.id}
        projectTitle={project.title}
        sourceModelVariantId={activeModelVariant?.databaseId}
        sourceRunId={currentSourceRunId}
        sourceArtifactPath={activeModelVariant?.finalArtifactPath ?? sourceRun.final_artifact_path}
        sourceArtifactSha256={sourceRun.artifact_sha256}
        providerName={providerName}
        steps={steps}
        forkNetwork={forkNetwork}
        forkContext={forkContext}
        allowForks
        defaultStepNumber={defaultStepNumber(sourceRun)}
        initialArtifactPath={resumeArtifactPath}
        trackResume={projectContext.isAuthenticated}
        acknowledgeModelUpdates={acknowledgeModelUpdates}
      />

      <ProjectCommunityPanel projectId={project.id} showForkLineage={false} />
    </div>
  )
}
