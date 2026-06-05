import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import SourceRunShowcase, { type SourceRunShowcaseStep } from '@/components/SourceRunShowcase'
import { getApprovedProjectForks, getPublishedPromptByIdNoFallback } from '@/lib/data'
import { POMODORO_TIMER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { projectForkSourceFromSubmissionFields } from '@/lib/project-forks'

const project = POMODORO_TIMER_SHOWCASE_PROJECT
const projectId = project.id
const sourceRunUrl = project.sourceUrl
const capturedAt = 'June 2, 2026'

function readArtifact(fileName: string, fallback: string) {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public/artifacts', fileName), 'utf8')
  } catch {
    return fallback
  }
}

function getPublicArtifactPath(fileName: string) {
  return `/artifacts/${fileName}`
}

function getSourceFilePath(fileName: string) {
  return `public/artifacts/${fileName}`
}

function toStep({
  step,
  code,
  finalArtifactCode,
}: {
  step: (typeof project.steps)[number]
  code: string
  finalArtifactCode: string
}): SourceRunShowcaseStep {
  const fileName = `pomodoro-step-${step.stepNumber}.html`
  const sourceFilePath = getSourceFilePath(fileName)
  const artifactTitle = `Pomodoro Focus Timer · step ${step.stepNumber} artifact`

  return {
    id: step.id,
    stepNumber: step.stepNumber,
    title: step.title,
    prompt: step.content,
    response: code,
    responseCopyText: code,
    notes: step.description,
    artifactPath: getPublicArtifactPath(fileName),
    artifactTitle,
    sourceFilePath,
    code,
    artifactVersions: step.stepNumber === 4
      ? [
          {
            id: `${step.id}-captured-step-4`,
            artifactPath: getPublicArtifactPath(fileName),
            artifactTitle,
            sourceFilePath,
            code,
            notes: 'Captured step 4 HTML response from the ChatGPT run.',
          },
          {
            id: `${step.id}-public-final`,
            artifactPath: getPublicArtifactPath('pomodoro-focus-timer-gpt55-instant.html'),
            artifactTitle: 'Pomodoro Focus Timer · verified public final',
            sourceFilePath: getSourceFilePath('pomodoro-focus-timer-gpt55-instant.html'),
            code: finalArtifactCode,
            notes: 'Current public final artifact path preserved as a selectable mount.',
            isDefault: true,
          },
        ]
      : undefined,
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
        <div className="mt-1 font-semibold text-surface-100">4 prompts · iterative build</div>
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

export default async function PomodoroTimerDemoPage() {
  const stepCodes = [
    readArtifact('pomodoro-step-1.html', 'Step 1 Pomodoro artifact capture is unavailable.'),
    readArtifact('pomodoro-step-2.html', 'Step 2 Pomodoro artifact capture is unavailable.'),
    readArtifact('pomodoro-step-3.html', 'Step 3 Pomodoro artifact capture is unavailable.'),
    readArtifact('pomodoro-step-4.html', 'Step 4 Pomodoro artifact capture is unavailable.'),
  ]
  const finalArtifactCode = readArtifact(
    'pomodoro-focus-timer-gpt55-instant.html',
    'Final Pomodoro artifact capture is unavailable.',
  )
  const steps = project.steps.map((step, index) => toStep({
    step,
    code: stepCodes[index] ?? 'Step Pomodoro artifact capture is unavailable.',
    finalArtifactCode,
  }))
  const [publishedProject, forkNetwork] = await Promise.all([
    getPublishedPromptByIdNoFallback(projectId),
    getApprovedProjectForks(projectId),
  ])
  const currentForkSource = publishedProject ? projectForkSourceFromSubmissionFields(publishedProject) : null

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
                Pomodoro focus timer, grown over four GPT prompts.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300">
                A GPT 5.5 Instant run started from a plain 25/5 countdown and layered on custom session lengths, a
                completed-sessions counter, an SVG progress ring, a Web Audio chime, and a polished dark theme — all in
                one self-contained HTML file.
              </p>
            </div>
            <RunSummary />
          </div>

          <ProjectEngagementBar projectId={projectId} loginNextPath="/pomodoro-timer-demo" />
        </div>
      </section>

      <SourceRunShowcase
        sourceRunUrl={sourceRunUrl}
        projectId={projectId}
        projectTitle={project.title}
        forkNetwork={forkNetwork}
        currentForkSource={currentForkSource}
        providerName="ChatGPT"
        steps={steps}
        defaultStepNumber={4}
        verificationNotes="Captured from a real ChatGPT GPT 5.5 Instant run. The final public artifact path is selectable separately because it differs from the captured step 4 file."
      />

      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
