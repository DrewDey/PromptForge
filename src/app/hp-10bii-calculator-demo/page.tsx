import Link from 'next/link'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import SourceRunShowcase, {
  type SourceRunShowcaseArtifactVersion,
  type SourceRunShowcaseStep,
} from '@/components/SourceRunShowcase'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getApprovedProjectForks } from '@/lib/data'
import { HP_10BII_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/hp-10bii-financial-calculator-claude-opus-48.json'

const project = HP_10BII_SHOWCASE_PROJECT
const projectId = project.id
const sourceRunUrl = project.sourceUrl
const capturedAt = 'June 1, 2026'

export const metadata = buildPreparedSourceRunDetailMetadata(project)

type Hp10BiiSeedStep = {
  step_number: number
  prompt_exact: string
  response_exact: string
  generated_files?: string[]
}

type Hp10BiiSourceRunPackage = {
  steps: Hp10BiiSeedStep[]
  final_artifact_path?: string
  pathforge_submission_url?: string
  pathforge_pending_id?: string
}

function getPublicArtifactPath(filePath?: string) {
  if (!filePath?.startsWith('public/artifacts/')) return null
  return `/${filePath.replace(/^public\//, '')}`
}

function artifactTitleForVersion(filePath: string) {
  if (filePath.includes('-initial')) return 'Initial warm/plum HP 10Bii+'
  if (filePath.includes('-claude-final')) return 'Claude final graphite HP 10Bii+'
  return 'Verified public HP 10Bii+ mount'
}

function artifactVersionsForStep(
  step: Hp10BiiSeedStep,
  finalArtifactPath?: string,
): SourceRunShowcaseArtifactVersion[] {
  return (step.generated_files ?? [])
    .filter((filePath) => filePath.startsWith('public/artifacts/'))
    .map((filePath, index) => {
      const artifactPath = getPublicArtifactPath(filePath)

      return {
        id: `${projectId}-step-${step.step_number}-artifact-${index + 1}`,
        artifactPath: artifactPath ?? '',
        artifactTitle: artifactTitleForVersion(filePath),
        isDefault: filePath === finalArtifactPath,
      }
    })
    .filter((version) => Boolean(version.artifactPath))
}

function toShowcaseStep(
  step: Hp10BiiSeedStep,
  finalArtifactPath?: string,
): SourceRunShowcaseStep {
  const projectStep = project.steps.find((item) => item.stepNumber === step.step_number)
  const artifactVersions = artifactVersionsForStep(step, finalArtifactPath)
  const primaryArtifact = artifactVersions[artifactVersions.length - 1]

  return {
    id: `${projectId}-step-${step.step_number}`,
    stepNumber: step.step_number,
    title: projectStep?.title ?? `Prompt ${step.step_number}`,
    prompt: step.prompt_exact,
    response: step.response_exact,
    artifactPath: primaryArtifact?.artifactPath,
    artifactTitle: primaryArtifact?.artifactTitle,
    artifactVersions,
  }
}

function RunSummary() {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="border border-surface-200 bg-white px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model
        </div>
        <div className="mt-1 font-semibold text-surface-900">{project.modelUsed}</div>
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

export default async function Hp10BiiCalculatorDemoPage() {
  const sourceRun = sourceRunPackage as Hp10BiiSourceRunPackage
  const steps = sourceRun.steps.map((step) => (
    toShowcaseStep(step, sourceRun.final_artifact_path)
  ))
  const forkNetwork = await getApprovedProjectForks(projectId)

  return (
    <main className="min-h-screen bg-surface-50 text-surface-900">
      <section className="border-b border-surface-200 bg-white text-surface-900">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="text-xs font-mono uppercase tracking-[0.18em] text-surface-500 hover:text-brand-orange"
            >
              PathForge
            </Link>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-3xl font-black leading-[0.96] tracking-normal sm:text-5xl">
                HP 10Bii+ calculator from a Claude run.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-600">
                A Claude source run produced a working financial calculator artifact, then a quick follow-up removed
                the unwanted red hue and finalized the black, silver, and green-LCD version.
              </p>
            </div>
            <RunSummary />
          </div>

          <ProjectEngagementBar projectId={projectId} loginNextPath="/hp-10bii-calculator-demo" />
        </div>
      </section>

      <SourceRunShowcase
        sourceRunUrl={sourceRunUrl}
        projectId={projectId}
        projectTitle={project.title}
        providerName="Claude"
        steps={steps}
        forkNetwork={forkNetwork}
        defaultStepNumber={2}
      />

      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
