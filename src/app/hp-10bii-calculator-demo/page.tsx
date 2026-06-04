import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import SourceRunShowcase, { type SourceRunShowcaseStep } from '@/components/SourceRunShowcase'
import { HP_10BII_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/hp-10bii-financial-calculator-claude-opus-48.json'

const project = HP_10BII_SHOWCASE_PROJECT
const projectId = project.id
const sourceRunUrl = project.sourceUrl
const capturedAt = 'June 1, 2026'

type Hp10BiiSeedStep = {
  step_number: number
  prompt_exact: string
  response_exact: string
  generated_files?: string[]
  notes?: string
}

function getPublicArtifactPath(filePath?: string) {
  if (!filePath?.startsWith('public/artifacts/')) return null
  return `/${filePath.replace(/^public\//, '')}`
}

function readArtifact(fileName: string, fallback: string) {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public/artifacts', fileName), 'utf8')
  } catch {
    return fallback
  }
}

function artifactFileForStep(step: Hp10BiiSeedStep) {
  const generatedFiles = step.generated_files ?? []
  return generatedFiles.find((filePath) => filePath.startsWith('public/artifacts/')) ?? null
}

function toShowcaseStep(step: Hp10BiiSeedStep): SourceRunShowcaseStep {
  const projectStep = project.steps.find((item) => item.stepNumber === step.step_number)
  const sourceFilePath = artifactFileForStep(step)
  const artifactPath = getPublicArtifactPath(sourceFilePath ?? undefined)
  const fileName = sourceFilePath ? path.basename(sourceFilePath) : null
  const code = fileName
    ? readArtifact(fileName, `Step ${step.step_number} HP 10Bii+ artifact capture is unavailable.`)
    : null

  return {
    id: `${projectId}-step-${step.step_number}`,
    stepNumber: step.step_number,
    title: projectStep?.title ?? `Prompt ${step.step_number}`,
    prompt: step.prompt_exact,
    response: step.response_exact,
    notes: step.notes,
    artifactPath,
    artifactTitle: step.step_number === 2 ? 'Final black/silver HP 10Bii+' : 'Initial HP 10Bii+ calculator',
    sourceFilePath,
    code,
  }
}

function RunSummary() {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-3">
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model
        </div>
        <div className="mt-1 font-semibold text-surface-100">{project.modelUsed}</div>
      </div>
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Run type
        </div>
        <div className="mt-1 font-semibold text-surface-100">2 prompts · 2 response packages</div>
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

export default function Hp10BiiCalculatorDemoPage() {
  const sourceRun = sourceRunPackage as { steps: Hp10BiiSeedStep[]; pathforge_submission_url?: string; pathforge_pending_id?: string }
  const steps = sourceRun.steps.map(toShowcaseStep)

  return (
    <main className="min-h-screen bg-surface-50 text-surface-900">
      <section className="border-b border-surface-800 bg-surface-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="text-xs font-mono uppercase tracking-[0.18em] text-surface-400 hover:text-brand-orange"
            >
              PathForge
            </Link>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-3xl font-black leading-[0.96] tracking-normal sm:text-5xl">
                HP 10Bii+ calculator from a Claude run.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300">
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
        pathforgeSourceRunUrl={sourceRun.pathforge_submission_url}
        sourceRunId={sourceRun.pathforge_pending_id}
        providerName="Claude"
        steps={steps}
        defaultStepNumber={2}
      />

      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
