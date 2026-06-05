import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import SourceRunShowcase, { type SourceRunShowcaseStep } from '@/components/SourceRunShowcase'
import { MEETING_COST_PROJECT_ID } from '@/lib/featured-projects'
import { MEETING_COST_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/meeting-cost-calculator-chatgpt-source-run.json'

type MeetingCostSeedStep = {
  step_number: number
  prompt_exact: string
  response_exact: string
  artifact_version_path?: string | null
  notes?: string
}

type MeetingCostSeedRun = {
  title: string
  model: string
  model_settings: string
  source_url: string
  verification_notes: string
  pathforge_submission_url: string
  source_run_submission_id: string
  steps: MeetingCostSeedStep[]
}

const project = MEETING_COST_SHOWCASE_PROJECT
const projectId = MEETING_COST_PROJECT_ID
const capturedAt = 'June 3, 2026'

function readArtifact(fileName: string, fallback: string) {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public/artifacts', fileName), 'utf8')
  } catch {
    return fallback
  }
}

function getPublicArtifactPath(artifactPath?: string | null) {
  if (!artifactPath?.startsWith('public/artifacts/')) return null
  return `/${artifactPath.replace(/^public\//, '')}`
}

function readArtifactFromPath(artifactPath?: string | null) {
  if (!artifactPath?.startsWith('public/artifacts/')) return null
  return readArtifact(path.basename(artifactPath), `Meeting Cost artifact capture is unavailable at ${artifactPath}.`)
}

function toStep(step: MeetingCostSeedStep): SourceRunShowcaseStep {
  const projectStep = project.steps.find((item) => item.stepNumber === step.step_number)

  return {
    id: `${projectId}-step-${step.step_number}`,
    stepNumber: step.step_number,
    title: projectStep?.title ?? `Prompt ${step.step_number}`,
    prompt: step.prompt_exact,
    response: step.response_exact,
    notes: step.notes ?? '',
    artifactPath: getPublicArtifactPath(step.artifact_version_path),
    artifactTitle: 'Meeting Cost Calculator final',
    sourceFilePath: step.artifact_version_path,
    code: readArtifactFromPath(step.artifact_version_path),
    callout: {
      tone: 'success',
      title: 'Default approved artifact',
      body: 'This is the one-shot ChatGPT artifact that loads first on the public page.',
    },
  }
}

function RunSummary({ sourceRun }: { sourceRun: MeetingCostSeedRun }) {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-3">
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model
        </div>
        <div className="mt-1 font-semibold text-surface-100">{sourceRun.model}</div>
      </div>
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Run type
        </div>
        <div className="mt-1 font-semibold text-surface-100">1 prompt · final artifact</div>
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

export default function MeetingCostCalculatorDemoPage() {
  const sourceRun = sourceRunPackage as MeetingCostSeedRun
  const steps = sourceRun.steps.map(toStep)

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
                Meeting Cost Calculator from a ChatGPT run.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300">
                A one-prompt ChatGPT source run produced a polished browser calculator that makes meeting cost and
                wasted time obvious, then exports a simple summary.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-surface-400">
                <span className="border border-surface-800 bg-surface-950 px-3 py-1.5">
                  Source run {sourceRun.source_run_submission_id}
                </span>
                <span className="border border-surface-800 bg-surface-950 px-3 py-1.5">
                  {sourceRun.model_settings}
                </span>
              </div>
            </div>
            <RunSummary sourceRun={sourceRun} />
          </div>

          <ProjectEngagementBar projectId={projectId} loginNextPath="/meeting-cost-calculator-demo" />
        </div>
      </section>

      <SourceRunShowcase
        sourceRunUrl={sourceRun.source_url}
        pathforgeSourceRunUrl={sourceRun.pathforge_submission_url}
        sourceRunId={sourceRun.source_run_submission_id}
        projectId={projectId}
        projectTitle={project.title}
        providerName="ChatGPT"
        verificationNotes={sourceRun.verification_notes}
        steps={steps}
        defaultStepNumber={1}
      />

      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
