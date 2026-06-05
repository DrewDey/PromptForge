import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import SourceRunShowcase, {
  type SourceRunShowcaseArtifactVersion,
  type SourceRunShowcaseStep,
} from '@/components/SourceRunShowcase'
import type { PreparedShowcaseProject } from '@/lib/prepared-showcase-projects'

type SourceRunPackageStep = {
  step_number: number
  prompt_exact: string
  response_exact: string
  artifact_version_path?: string | null
  generated_files?: string[]
  notes?: string
}

type SourceRunPackage = {
  title?: string
  model?: string
  model_settings?: string | Record<string, string>
  provider?: string
  source_url?: string
  verification_notes?: string | string[]
  final_artifact_path?: string
  pathforge_submission_url?: string
  pathforge_pending_id?: string
  source_run_submission_id?: string
  steps: SourceRunPackageStep[]
}

function readArtifact(artifactPath?: string | null) {
  if (!artifactPath?.startsWith('public/artifacts/')) return null

  try {
    return fs.readFileSync(path.join(process.cwd(), 'public', 'artifacts', path.basename(artifactPath)), 'utf8')
  } catch {
    return `Artifact capture is unavailable at ${artifactPath}.`
  }
}

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

function modelSettingsText(settings: SourceRunPackage['model_settings']) {
  if (!settings) return null
  if (typeof settings === 'string') return settings
  return Object.entries(settings)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ')
}

function verificationNotesText(notes: SourceRunPackage['verification_notes']) {
  if (Array.isArray(notes)) return notes.join('\n')
  return notes
}

function sourceRunId(sourceRun: SourceRunPackage, project: PreparedShowcaseProject) {
  return sourceRun.source_run_submission_id ?? sourceRun.pathforge_pending_id ?? project.sourceRunId
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
        sourceFilePath: filePath,
        code: readArtifact(filePath) ?? `Artifact capture is unavailable at ${filePath}.`,
        notes: isDefault
          ? 'Final public artifact path; mounted by default.'
          : undefined,
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
    notes: step.notes ?? projectStep?.description,
    artifactPath: primaryArtifact?.artifactPath,
    artifactTitle: primaryArtifact?.artifactTitle ?? artifactTitle(project, step, sourceRun.final_artifact_path),
    sourceFilePath: primaryArtifact?.sourceFilePath,
    code: primaryArtifact?.code,
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

function RunSummary({
  sourceRun,
  project,
  capturedAt,
}: {
  sourceRun: SourceRunPackage
  project: PreparedShowcaseProject
  capturedAt: string
}) {
  const artifactCount = sourceRun.steps.filter((step) => step.artifact_version_path).length

  return (
    <div className="grid gap-3 text-sm sm:grid-cols-3">
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model
        </div>
        <div className="mt-1 font-semibold text-surface-100">{sourceRun.model ?? project.modelUsed}</div>
      </div>
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Run type
        </div>
        <div className="mt-1 font-semibold text-surface-100">
          {sourceRun.steps.length} prompts · {artifactCount} artifact packages
        </div>
      </div>
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Captured
        </div>
        <div className="mt-1 font-semibold text-surface-100">{capturedAt}</div>
      </div>
    </div>
  )
}

export default function PreparedSourceRunPage({
  project,
  sourceRunPackage,
  route,
  capturedAt,
}: {
  project: PreparedShowcaseProject
  sourceRunPackage: SourceRunPackage
  route: string
  capturedAt: string
}) {
  const sourceRun = sourceRunPackage
  const providerName = getProviderName(sourceRun, project)
  const sourceUrl = sourceRun.source_url || project.sourceUrl
  const settingsText = modelSettingsText(sourceRun.model_settings)
  const steps = sourceRun.steps.map((step) => toShowcaseStep(step, sourceRun, project))

  return (
    <main className="min-h-screen bg-surface-50 text-surface-900">
      <section className="border-b border-surface-800 bg-surface-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="font-mono text-xs uppercase tracking-[0.18em] text-surface-400 hover:text-brand-orange"
            >
              PathForge
            </Link>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-3xl font-black leading-[0.96] tracking-normal sm:text-5xl">
                {project.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300">
                {project.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-surface-400">
                <span className="border border-surface-800 bg-surface-950 px-3 py-1.5">
                  Source run {sourceRunId(sourceRun, project)}
                </span>
                {settingsText && (
                  <span className="max-w-3xl border border-surface-800 bg-surface-950 px-3 py-1.5">
                    {settingsText}
                  </span>
                )}
              </div>
            </div>
            <RunSummary sourceRun={sourceRun} project={project} capturedAt={capturedAt} />
          </div>

          <ProjectEngagementBar projectId={project.id} loginNextPath={route} />
        </div>
      </section>

      <SourceRunShowcase
        sourceRunUrl={sourceUrl}
        pathforgeSourceRunUrl={sourceRun.pathforge_submission_url}
        sourceRunId={sourceRunId(sourceRun, project)}
        projectId={project.id}
        projectTitle={project.title}
        providerName={providerName}
        verificationNotes={verificationNotesText(sourceRun.verification_notes)}
        steps={steps}
        defaultStepNumber={defaultStepNumber(sourceRun)}
      />

      <ProjectCommunityPanel projectId={project.id} />
    </main>
  )
}
