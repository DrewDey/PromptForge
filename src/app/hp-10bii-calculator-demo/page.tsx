import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import { HP_10BII_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import Hp10BiiSourceRunExplorer from './Hp10BiiSourceRunExplorer'

const project = HP_10BII_SHOWCASE_PROJECT
const projectId = project.id
const sourceRunUrl = project.sourceUrl
const capturedAt = 'June 1, 2026'

function readArtifact(fileName: string, fallback: string) {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public/artifacts', fileName), 'utf8')
  } catch {
    return fallback
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
  const stepCodes = [
    readArtifact('hp-10bii-step-1.html', 'Step 1 HP 10Bii+ artifact capture is unavailable.'),
    readArtifact('hp-10bii-step-2.html', 'Step 2 HP 10Bii+ artifact capture is unavailable.'),
  ]

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

      <Hp10BiiSourceRunExplorer
        sourceRunUrl={sourceRunUrl}
        steps={project.steps}
        stepCodes={stepCodes}
      />

      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
