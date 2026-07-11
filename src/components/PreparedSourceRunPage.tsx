import Link from 'next/link'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import PathForgeLabsModelRuns, {
  PathForgeLabsModelComparison,
} from '@/components/PathForgeLabsModelRuns'
import SourceRunShowcase, {
  type SourceRunShowcaseArtifactVersion,
  type SourceRunShowcaseStep,
} from '@/components/SourceRunShowcase'
import { getApprovedProjectForks } from '@/lib/data'
import type { PreparedShowcaseProject } from '@/lib/prepared-showcase-projects'
import type {
  ProjectModelVariant,
  ProjectModelVariantSet,
} from '@/lib/project-model-variants'
import type { SourceRunPackage, SourceRunPackageStep } from '@/lib/source-run-package'

function getPublicArtifactPath(artifactPath?: string | null) {
  if (!artifactPath?.startsWith('public/artifacts/')) return null
  return `/${artifactPath.replace(/^public\//, '')}`
}

function getProviderName(sourceRun: SourceRunPackage, project: PreparedShowcaseProject) {
  const provider = sourceRun.provider?.trim()
  if (provider?.toLowerCase() === 'chatgpt') return 'ChatGPT'
  if (provider) return provider
  if (project.modelUsed.toLowerCase().includes('gemini')) return 'Gemini'
  if (project.modelUsed.toLowerCase().includes('claude')) return 'Claude'
  return 'AI'
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
        isDefault,
      })

      return versions
    }, [])
}

function toShowcaseStep(
  step: SourceRunPackageStep,
  sourceRun: SourceRunPackage,
  project: PreparedShowcaseProject,
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
    id: `${project.id}-step-${step.step_number}`,
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
  project: PreparedShowcaseProject,
) {
  const forkPointStepNumber = project.forkSource?.sourceStepNumber
  if (!forkPointStepNumber) return sourceRun.steps

  const continuationSteps = sourceRun.steps.filter((step) => step.step_number > forkPointStepNumber)
  return continuationSteps.length > 0 ? continuationSteps : sourceRun.steps
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
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="border border-surface-200 bg-white px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model
        </div>
        <div className="mt-1 font-semibold text-surface-900">{sourceRun.model ?? project.modelUsed}</div>
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
}: {
  project: PreparedShowcaseProject
  sourceRunPackage: SourceRunPackage
  route: string
  capturedAt: string
  modelVariantSet?: ProjectModelVariantSet | null
  activeModelVariant?: ProjectModelVariant | null
  compareModelVariant?: ProjectModelVariant | null
  modelVariantRegistryWarning?: string
}) {
  const sourceRun = sourceRunPackage
  const providerName = getProviderName(sourceRun, project)
  const sourceUrl = sourceRun.source_url || project.sourceUrl
  const steps = mainPathSourceSteps(sourceRun, project).map((step) => toShowcaseStep(step, sourceRun, project))
  const usesModelVariants = Boolean(modelVariantSet && activeModelVariant)
  const isHistoricalOriginalRun =
    !usesModelVariants || activeModelVariant?.runRole === 'historical-baseline'
  const forkNetwork = isHistoricalOriginalRun ? await getApprovedProjectForks(project.id) : []

  return (
    <main className="min-h-screen bg-surface-50 text-surface-900">
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

          <ProjectEngagementBar projectId={project.id} loginNextPath={route} />
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
        projectId={project.id}
        projectTitle={project.title}
        providerName={providerName}
        steps={steps}
        forkNetwork={forkNetwork}
        allowForks={isHistoricalOriginalRun}
        defaultStepNumber={defaultStepNumber(sourceRun)}
      />

      <ProjectCommunityPanel projectId={project.id} />
    </main>
  )
}
