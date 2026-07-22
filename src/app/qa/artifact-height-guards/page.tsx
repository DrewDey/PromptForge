import { notFound } from 'next/navigation'
import {
  ModelComparisonViewportManager,
  ModelVariantViewLink,
} from '@/components/ModelComparisonPreviewLink'
import SourceRunShowcase, {
  ProtectedArtifactFrame,
  type ArtifactPackage,
  type SourceRunShowcaseStep,
} from '@/components/SourceRunShowcase'

export const metadata = {
  robots: { index: false, follow: false },
}

const cases = {
  feedback: {
    title: 'Viewport feedback-loop fixture',
    artifactPath: '/qa/artifact-height-guards/feedback',
  },
  limits: {
    title: 'Raw measurement-limit fixture',
    artifactPath: '/qa/artifact-height-guards/limits',
  },
} as const

type GuardCase = keyof typeof cases

const pendingSteps = [
  {
    id: 'qa-pending:tall',
    stepNumber: 1,
    title: 'Tall starting artifact',
    prompt: 'Mount the tall control artifact.',
    response: 'The tall fixture establishes the starting frame height.',
    artifactPath: '/qa/artifact-height-guards/tall',
    artifactTitle: 'Tall pending-state control',
  },
  {
    id: 'qa-pending:delayed',
    stepNumber: 2,
    title: 'Delayed shorter artifact',
    prompt: 'Replace the tall artifact with a deliberately delayed shorter artifact.',
    response: 'The clicked control must remain fixed during every pending and resize frame.',
    artifactPath: '/qa/artifact-height-guards/delayed',
    artifactTitle: 'Delayed shorter artifact',
  },
  {
    id: 'qa-pending:missing',
    stepNumber: 3,
    title: 'Missing artifact fallback',
    prompt: 'Replace the artifact with a missing protected source.',
    response: 'The error state must settle promptly without moving the clicked control.',
    artifactPath: '/qa/artifact-height-guards/missing',
    artifactTitle: 'Missing artifact fallback',
  },
  {
    id: 'qa-pending:remount',
    stepNumber: 4,
    title: 'Remounted late-growth artifact',
    prompt: 'Settle this artifact, briefly select a slow artifact, then immediately return.',
    response: 'Every remounted document generation must re-enter the pending measurement state.',
    artifactPath: '/qa/artifact-height-guards/remount',
    artifactTitle: 'Remounted late-growth artifact',
  },
  {
    id: 'qa-pending:slow',
    stepNumber: 5,
    title: 'Slow intermediate artifact',
    prompt: 'Keep the response pending long enough to exercise a rapid return.',
    response: 'This source should be left before it produces a measurement.',
    artifactPath: '/qa/artifact-height-guards/slow',
    artifactTitle: 'Slow intermediate artifact',
  },
] satisfies SourceRunShowcaseStep[]

const routeRuns = [
  {
    id: 'tall',
    title: 'Tall route artifact',
    artifactPath: '/qa/artifact-height-guards/tall',
  },
  {
    id: 'delayed',
    title: 'Delayed shorter route artifact',
    artifactPath: '/qa/artifact-height-guards/delayed',
  },
  {
    id: 'missing',
    title: 'Missing route artifact',
    artifactPath: '/qa/artifact-height-guards/missing',
  },
] as const

type RouteRun = (typeof routeRuns)[number]

function routeRunHref(runId: RouteRun['id']) {
  return `/qa/artifact-height-guards?case=route&run=${runId}&renderDelay=180`
}

function PendingArtifactSelectionFixture() {
  return (
    <main className="min-h-screen bg-surface-50" data-artifact-height-guard-fixture="pending-selection">
      <header className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">
          Local QA only
        </p>
        <h1 className="mt-2 text-3xl font-black text-surface-900">
          Pending artifact selection anchoring
        </h1>
      </header>
      <SourceRunShowcase
        providerName="PathForge QA"
        steps={pendingSteps}
        defaultStepNumber={1}
        allowForks={false}
      />
    </main>
  )
}

function PendingRouteFixture({ run }: { run: RouteRun }) {
  const selectedPackage: ArtifactPackage = {
    id: 'artifact-height-route:shared',
    stepId: `artifact-height-route:${run.id}:step:1`,
    stepNumber: 1,
    title: run.title,
    prompt: 'Exercise route-level viewport preservation while the artifact is pending.',
    response: 'The local-only route fixture uses the production viewport-preserving link.',
    artifactPath: run.artifactPath,
    artifactTitle: run.title,
    artifactOrdinal: 1,
    artifactCount: 1,
    isDefaultArtifact: true,
  }

  return (
    <main className="min-h-screen bg-surface-50 py-10" data-artifact-height-guard-fixture="pending-route">
      <ModelComparisonViewportManager navigationKey={`qa-route:${run.id}`} />
      <header className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">
          Local QA only
        </p>
        <h1 className="mt-2 text-3xl font-black text-surface-900">
          Pending model-route anchoring
        </h1>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="QA artifact routes">
          {routeRuns.map((candidate) => candidate.id === run.id ? (
            <span
              key={candidate.id}
              className="border border-brand-blue bg-brand-blue px-3 py-2 text-xs font-black text-white"
              aria-current="page"
              data-qa-route-run={candidate.id}
            >
              Viewing {candidate.id}
            </span>
          ) : (
            <span key={candidate.id} data-qa-route-run={candidate.id}>
              <ModelVariantViewLink
                href={routeRunHref(candidate.id)}
                ariaLabel={`View ${candidate.title}`}
                className="inline-flex border border-brand-blue/30 bg-white px-3 py-2 text-xs font-black text-brand-blue"
                prefetch={false}
              >
                View {candidate.id}
              </ModelVariantViewLink>
            </span>
          ))}
        </nav>
      </header>

      <section className="border-b border-surface-200 bg-surface-50 px-4 pb-9 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ProtectedArtifactFrame
            selectedPackage={selectedPackage}
            providerName="PathForge QA"
            showOpenAction={false}
          />
        </div>
      </section>

      <section
        id="source-run-path"
        className="mx-auto min-h-[2400px] max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        data-qa-guard-wiring
      >
        <div className="border-l-4 border-[#2bd15f] pl-4">
          <h2 className="text-3xl font-black text-surface-900">Build path</h2>
          <p className="mt-2 text-sm text-surface-500">
            This anchor must remain fixed throughout pending route navigation.
          </p>
        </div>
      </section>
    </main>
  )
}

export default async function ArtifactHeightGuardsPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string; run?: string; renderDelay?: string }>
}) {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const params = await searchParams
  const requestedCase = params.case
  if (requestedCase === 'pending') return <PendingArtifactSelectionFixture />
  if (requestedCase === 'route') {
    const requestedRenderDelay = Number(params.renderDelay)
    if (Number.isFinite(requestedRenderDelay) && requestedRenderDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(requestedRenderDelay, 500)))
    }
    const run = routeRuns.find((candidate) => candidate.id === params.run) ?? routeRuns[0]
    return <PendingRouteFixture run={run} />
  }

  const guardCase: GuardCase = requestedCase === 'limits' ? 'limits' : 'feedback'
  const fixture = cases[guardCase]
  const selectedPackage: ArtifactPackage = {
    id: `artifact-height-guard:${guardCase}`,
    stepId: `artifact-height-guard:${guardCase}:step:1`,
    stepNumber: 1,
    title: fixture.title,
    prompt: 'Exercise the protected artifact height guard.',
    response: 'The local-only fixture mounted inside the production artifact frame.',
    artifactPath: fixture.artifactPath,
    artifactTitle: fixture.title,
    artifactOrdinal: 1,
    artifactCount: 1,
    isDefaultArtifact: true,
  }

  return (
    <main className="min-h-screen bg-surface-50 py-12" data-artifact-height-guard-fixture={guardCase}>
      <header className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">
          Local QA only
        </p>
        <h1 className="mt-2 text-3xl font-black text-surface-900">{fixture.title}</h1>
      </header>

      <section className="border-b border-surface-200 bg-surface-50 px-4 pb-9 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ProtectedArtifactFrame
            selectedPackage={selectedPackage}
            providerName="PathForge QA"
            showOpenAction={false}
          />
        </div>
      </section>

      <section
        id="source-run-path"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        data-qa-guard-wiring
      >
        <div className="border-l-4 border-[#2bd15f] pl-4">
          <h2 className="text-3xl font-black text-surface-900">Build path</h2>
          <p className="mt-2 text-sm text-surface-500">
            The fallback frame must stay bounded directly above this wiring marker.
          </p>
        </div>
      </section>
    </main>
  )
}
