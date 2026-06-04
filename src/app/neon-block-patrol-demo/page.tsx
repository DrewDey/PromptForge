import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import { NEON_BLOCK_PATROL_PROJECT_ID } from '@/lib/featured-projects'
import { NEON_BLOCK_PATROL_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/gta-style-fps-chatgpt-gpt55-heavy-five-prompt.json'
import NeonBlockPatrolSourceRunExplorer from './NeonBlockPatrolSourceRunExplorer'

type RawSourceRunStep = {
  step_number: number
  prompt_exact: string
  response_exact: string
  response_summary?: string
  notes?: string
  artifact_version_path?: string | null
}

const project = NEON_BLOCK_PATROL_SHOWCASE_PROJECT
const projectId = NEON_BLOCK_PATROL_PROJECT_ID
const sourceRunUrl = project.sourceUrl || sourceRunPackage.source_url
const capturedAt = 'June 3, 2026'

const stepTitles: Record<number, string> = {
  1: 'Build the safe open-city prototype',
  2: 'Improve target and checkpoint readability',
  3: 'Call out the duplicate download',
  4: 'Request a fresh v3 download',
  5: 'Paste the complete v3 HTML inline',
}

function toPublicArtifactPath(artifactVersionPath?: string | null) {
  if (!artifactVersionPath?.startsWith('public/artifacts/')) return null
  return artifactVersionPath.replace(/^public/, '')
}

function readArtifact(artifactVersionPath?: string | null) {
  if (!artifactVersionPath?.startsWith('public/artifacts/')) return null

  try {
    return fs.readFileSync(path.join(process.cwd(), 'public', 'artifacts', path.basename(artifactVersionPath)), 'utf8')
  } catch {
    return `Artifact capture is unavailable for ${artifactVersionPath}.`
  }
}

function sourceFileName(artifactVersionPath?: string | null) {
  if (!artifactVersionPath) return null
  return path.basename(artifactVersionPath)
}

function RunSummary() {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-3">
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model
        </div>
        <div className="mt-1 font-semibold text-surface-100">{project.modelUsed || sourceRunPackage.model}</div>
      </div>
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Run type
        </div>
        <div className="mt-1 font-semibold text-surface-100">5 prompts · 3 artifact packages</div>
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

export default function NeonBlockPatrolDemoPage() {
  const steps = (sourceRunPackage.steps as RawSourceRunStep[]).map((step) => ({
    id: `${projectId}-step-${step.step_number}`,
    stepNumber: step.step_number,
    title: stepTitles[step.step_number] ?? `Step ${step.step_number}`,
    content: step.prompt_exact,
    responseExact: step.response_exact,
    responseSummary: step.response_summary ?? '',
    notes: step.notes ?? '',
    artifactPath: toPublicArtifactPath(step.artifact_version_path),
    sourceFilePath: sourceFileName(step.artifact_version_path),
    code: readArtifact(step.artifact_version_path),
  }))

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
                Neon Block Patrol v3 from a five-prompt ChatGPT run.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300">
                A Heavy ChatGPT source run iterated on a safe arcade-only open-city prototype until the final inline
                HTML fixed the v3 badge, starting LEFT count, obvious target cues, checkpoint visibility, minimap, and
                hit feedback.
              </p>
            </div>
            <RunSummary />
          </div>

          <ProjectEngagementBar projectId={projectId} loginNextPath="/neon-block-patrol-demo" />
        </div>
      </section>

      <NeonBlockPatrolSourceRunExplorer
        sourceRunUrl={sourceRunUrl}
        pathforgeSourceRunUrl={sourceRunPackage.pathforge_submission_url}
        sourceRunId={sourceRunPackage.source_run_submission_id}
        steps={steps}
      />

      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
