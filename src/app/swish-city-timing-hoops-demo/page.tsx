import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import { SWISH_CITY_PROJECT_ID } from '@/lib/featured-projects'
import { SWISH_CITY_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/swish-city-claude-opus-4-8-source-run.json'
import SwishCitySourceRunExplorer, {
  type SwishCitySourceStep,
} from './SwishCitySourceRunExplorer'

const project = SWISH_CITY_SHOWCASE_PROJECT
const projectId = SWISH_CITY_PROJECT_ID
const sourceRunUrl = sourceRunPackage.source_url || project.sourceUrl
const pathforgeSourceRunUrl = sourceRunPackage.pathforge_submission_url
const sourceRunId = sourceRunPackage.pathforge_pending_id
const capturedAt = 'June 3, 2026'

const sourceSteps: SwishCitySourceStep[] = [
  {
    id: `${SWISH_CITY_PROJECT_ID}-step-1`,
    stepNumber: 1,
    title: 'Start the timing-hoops game',
    content:
      'Make me a single-file browser arcade basketball game inspired by Megatouch Hoop Jones, without using its name, branding, or copyrighted art. Core loop: the ball moves back and forth across hands/players, the player clicks/taps at the right timing to shoot, the action moves left to right through multiple shooters, each round starts close to the hoop and then backs up farther, misses get arcade callouts like BRICK and AIRBALL, and three makes trigger a lightning/backboard bonus for extra points. Keep it family-safe, polished, and playable in one HTML file.',
    responseNote:
      'Response 1: Claude began an extended visible reasoning/planning response and failed before producing an HTML artifact. The UI showed "Claude couldn\'t finish this response. Try again in a moment."',
    hasArtifact: false,
  },
  {
    id: `${SWISH_CITY_PROJECT_ID}-step-2`,
    stepNumber: 2,
    title: 'Recover the interrupted file',
    content:
      "Claude couldn't finish that response before producing the file. Please continue by outputting one complete, working single-file HTML game now. Keep the Hoop-Jones-inspired mechanics: four shooters across the bottom, ball timing across hands, click/tap to shoot, round-by-round distance increase, BRICK/AIRBALL/SWISH callouts, and a lightning backboard bonus after three makes. Please put the entire artifact in one html code block and skip further planning.",
    responseNote: 'Response 2: no usable visible assistant response or code block was returned.',
    hasArtifact: false,
  },
  {
    id: `${SWISH_CITY_PROJECT_ID}-step-3`,
    stepNumber: 3,
    title: 'Force a complete playable artifact',
    content:
      'Please output ONLY a complete single-file HTML document now, no explanation before or after. It must be playable: four red-jersey shooters across the bottom, a basketball timing sweep across their hands, click/tap/space to shoot, hoop/backboard at the top, rounds that move the shooters farther away, SWISH/BRICK/AIRBALL callouts, and a lightning backboard bonus after 3 makes. Use plain canvas/JS/CSS in one file.',
    responseNote:
      'Response 3: exact HTML code block saved verbatim at public/artifacts/swish-city-claude-opus-4-8.html.',
    hasArtifact: true,
  },
]

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
        <div className="mt-1 font-semibold text-surface-100">3 prompts · final artifact</div>
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

export default function SwishCityTimingHoopsDemoPage() {
  const finalArtifactCode = readArtifact(
    'swish-city-claude-opus-4-8.html',
    'Swish City Timing Hoops final artifact capture is unavailable.',
  )

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
                Swish City Timing Hoops from a Claude recovery run.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300">
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

      <SwishCitySourceRunExplorer
        sourceRunUrl={sourceRunUrl}
        pathforgeSourceRunUrl={pathforgeSourceRunUrl}
        sourceRunId={sourceRunId}
        steps={sourceSteps}
        finalArtifactCode={finalArtifactCode}
      />

      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
