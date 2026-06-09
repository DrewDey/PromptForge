import Link from 'next/link'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import SourceRunShowcase, { type SourceRunShowcaseStep } from '@/components/SourceRunShowcase'
import { getApprovedProjectForks } from '@/lib/data'
import { SWISH_CITY_PROJECT_ID } from '@/lib/featured-projects'
import { SWISH_CITY_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/swish-city-claude-opus-4-8-source-run.json'

const project = SWISH_CITY_SHOWCASE_PROJECT
const projectId = SWISH_CITY_PROJECT_ID
const sourceRunUrl = sourceRunPackage.source_url || project.sourceUrl
const capturedAt = 'June 3, 2026'

type SwishCitySeedStep = {
  step_number: number
  prompt_exact: string
  response_exact: string
  artifact_version_path?: string | null
}

function getPublicArtifactPath(artifactPath?: string | null) {
  if (!artifactPath?.startsWith('public/artifacts/')) return null
  return `/${artifactPath.replace(/^public\//, '')}`
}

function toStep(step: SwishCitySeedStep): SourceRunShowcaseStep {
  const projectStep = project.steps.find((item) => item.stepNumber === step.step_number)
  return {
    id: `${SWISH_CITY_PROJECT_ID}-step-${step.step_number}`,
    stepNumber: step.step_number,
    title: projectStep?.title ?? `Prompt ${step.step_number}`,
    prompt: step.prompt_exact,
    response: step.response_exact,
    artifactPath: getPublicArtifactPath(step.artifact_version_path),
    artifactTitle: step.step_number === 3 ? 'Swish City arcade hoops final' : undefined,
    callout: step.step_number === 1
      ? {
          tone: 'warning',
          title: 'Failed first generation',
          body: 'Claude did not complete the first response, so no artifact was produced for this turn.',
        }
      : step.step_number === 2
        ? {
            tone: 'warning',
            title: 'No usable recovery response',
            body: 'The second recovery prompt also produced no usable visible code block.',
          }
        : {
            tone: 'success',
            title: 'Default approved artifact',
            body: 'This is the playable Swish City artifact that loads first on the public page.',
          },
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

export default async function SwishCityTimingHoopsDemoPage() {
  const steps = (sourceRunPackage.steps as SwishCitySeedStep[]).map(toStep)
  const forkNetwork = await getApprovedProjectForks(projectId)

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

          <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-3xl font-black leading-[0.96] tracking-normal sm:text-5xl">
                Swish City Timing Hoops from a Claude recovery run.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-600">
                A Claude Opus 4.8 Max run recovered from two failed starts and produced a
                family-safe canvas basketball timing game. The reference game was identified
                as Megatouch Hoop Jones with high confidence, while the final artifact uses
                its own Swish City title and original browser-game art.
              </p>
            </div>
            <RunSummary />
          </div>

          <ProjectEngagementBar
            projectId={projectId}
            loginNextPath="/swish-city-timing-hoops-demo"
          />
        </div>
      </section>

      <SourceRunShowcase
        sourceRunUrl={sourceRunUrl}
        projectId={projectId}
        projectTitle={project.title}
        providerName="Claude"
        steps={steps}
        forkNetwork={forkNetwork}
        defaultStepNumber={3}
      />

      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
