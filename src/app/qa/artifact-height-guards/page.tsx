import { notFound } from 'next/navigation'
import {
  ProtectedArtifactFrame,
  type ArtifactPackage,
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

export default async function ArtifactHeightGuardsPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>
}) {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const requestedCase = (await searchParams).case
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
