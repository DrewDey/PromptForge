import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import SourceRunShowcase, { type SourceRunShowcaseStep } from '@/components/SourceRunShowcase'
import { getApprovedProjectForks } from '@/lib/data'
import { WEEKEND_CHECKLIST_PROJECT_ID } from '@/lib/featured-projects'
import { WEEKEND_CHECKLIST_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/weekend-plan-checklist-chatgpt-6prompt-fixed.json'

type WeekendPlanChecklistSeedStep = {
  step_number: number
  prompt_exact: string
  response_exact: string
  artifact_version_path?: string
  notes?: string
}

type WeekendPlanChecklistSeedRun = {
  title: string
  model: string
  model_settings: string
  source_url: string
  run_finished_at: string
  verification_notes: string
  pathforge_submission_url: string
  source_run_submission_id: string
  steps: WeekendPlanChecklistSeedStep[]
}

const project = WEEKEND_CHECKLIST_SHOWCASE_PROJECT
const projectId = WEEKEND_CHECKLIST_PROJECT_ID
const capturedAt = 'June 3, 2026'

function readArtifactFile(fileName: string, fallback: string) {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public', 'artifacts', fileName), 'utf8')
  } catch {
    return fallback
  }
}

function getPublicArtifactPath(artifactPath?: string) {
  if (!artifactPath?.startsWith('public/artifacts/')) {
    return null
  }

  return `/${artifactPath.replace(/^public\//, '')}`
}

function getPublicArtifactFileName(artifactPath?: string) {
  if (!artifactPath?.startsWith('public/artifacts/')) {
    return null
  }

  return path.basename(artifactPath)
}

function toStep(step: WeekendPlanChecklistSeedStep): SourceRunShowcaseStep {
  const artifactPath = getPublicArtifactPath(step.artifact_version_path)
  const artifactFileName = getPublicArtifactFileName(step.artifact_version_path)
  const sourceFilePath = step.artifact_version_path ?? 'No local artifact file captured'
  const code = artifactFileName
    ? readArtifactFile(
        artifactFileName,
        `Step ${step.step_number} Weekend Plan Checklist artifact capture is unavailable.`,
      )
    : null

  return {
    id: `${projectId}-step-${step.step_number}`,
    stepNumber: step.step_number,
    title: `Prompt ${step.step_number}`,
    prompt: step.prompt_exact,
    response: step.response_exact,
    notes: step.notes ?? '',
    artifactPath,
    artifactTitle: step.step_number === 6
      ? 'Final fixed weekend checklist'
      : `Weekend checklist step ${step.step_number}`,
    sourceFilePath,
    code,
    callout: step.step_number === 5
      ? {
          tone: 'warning',
          title: 'Verified broken intermediate artifact',
          body:
            'This version is preserved because ChatGPT produced it, but verification found ReferenceError: nextFiveItems is not defined. Prompt 6 fixed that bug.',
        }
      : step.step_number === 6
        ? {
            tone: 'success',
            title: 'Default approved artifact',
            body: 'This is the fixed version that loads first on the public page.',
          }
        : undefined,
  }
}

function RunSummary({ sourceRun }: { sourceRun: WeekendPlanChecklistSeedRun }) {
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
        <div className="mt-1 font-semibold text-surface-100">6 prompts · step 6 fixed step 5</div>
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

export default async function WeekendPlanChecklistDemoPage() {
  const sourceRun = sourceRunPackage as WeekendPlanChecklistSeedRun
  const steps = sourceRun.steps.map(toStep)
  const sourceRunUrl = sourceRun.source_url || project.sourceUrl
  const forkNetwork = await getApprovedProjectForks(projectId)

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
                {sourceRun.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300">
                A ChatGPT source run turned a messy weekend plan into a local-storage checklist, then iterated through
                deduping, essentials, filters, timing groups, cleaner row controls, and a sixth prompt that fixed the
                step 5 <code className="text-surface-100">nextFiveItems</code> error.
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

          <ProjectEngagementBar projectId={projectId} loginNextPath="/weekend-plan-checklist-demo" />
        </div>
      </section>

      <SourceRunShowcase
        sourceRunUrl={sourceRunUrl}
        pathforgeSourceRunUrl={sourceRun.pathforge_submission_url}
        sourceRunId={sourceRun.source_run_submission_id}
        projectId={projectId}
        projectTitle={project.title}
        providerName="ChatGPT"
        verificationNotes={sourceRun.verification_notes}
        steps={steps}
        forkNetwork={forkNetwork}
        defaultStepNumber={6}
      />

      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
