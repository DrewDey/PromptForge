import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ProtectedArtifactFrame,
  type ArtifactPackage,
} from '@/components/SourceRunShowcase'

type ArtifactViewerSearchParams = Promise<{
  path?: string | string[]
  title?: string | string[]
  provider?: string | string[]
}>

function singleValue(value?: string | string[]) {
  return typeof value === 'string' ? value : undefined
}

function safeArtifactPath(value?: string) {
  if (
    !value ||
    !/^\/artifacts\/[A-Za-z0-9][A-Za-z0-9._/-]*\.html$/.test(value) ||
    value.includes('\\') ||
    value.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    return null
  }
  return value
}

function safeLabel(value: string | undefined, fallback: string, maxLength: number) {
  const normalized = value?.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, maxLength) : fallback
}

export default async function ArtifactViewerPage({
  searchParams,
}: {
  searchParams: ArtifactViewerSearchParams
}) {
  const params = await searchParams
  const artifactPath = safeArtifactPath(singleValue(params.path))
  if (!artifactPath) notFound()

  const artifactTitle = safeLabel(singleValue(params.title), 'PathForge artifact', 140)
  const providerName = safeLabel(singleValue(params.provider), 'AI', 80)
  const selectedPackage: ArtifactPackage = {
    id: `protected-viewer:${artifactPath}`,
    stepId: 'protected-viewer',
    stepNumber: 1,
    title: artifactTitle,
    prompt: '',
    response: '',
    artifactPath,
    artifactTitle,
    artifactOrdinal: 1,
    artifactCount: 1,
    isDefaultArtifact: true,
  }

  return (
    <main className="fixed inset-0 z-[100] overflow-auto bg-surface-950 text-white">
      <header className="border-b border-surface-800 bg-surface-900 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-brand-orange hover:text-orange-300"
            >
              PathForge
            </Link>
            <h1 className="mt-1 text-lg font-black">Protected artifact viewer</h1>
            <p className="mt-1 text-xs leading-5 text-surface-400">
              Runs in an opaque-origin sandbox with direct API and external asset access blocked.
            </p>
          </div>
          <a
            href={artifactPath}
            download
            className="border border-surface-600 px-3 py-2 text-xs font-bold text-surface-200 transition hover:border-brand-orange hover:text-brand-orange"
          >
            Download HTML
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-3 sm:p-5">
        <ProtectedArtifactFrame
          selectedPackage={selectedPackage}
          providerName={providerName}
          showOpenAction={false}
          frameHeight="calc(100svh - 176px)"
          contextLabel="Isolated full-page preview"
        />
      </div>
    </main>
  )
}
