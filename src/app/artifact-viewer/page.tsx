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
  const isPreparedArtifact = Boolean(
    value && /^\/artifacts\/[A-Za-z0-9][A-Za-z0-9._/-]*\.html$/.test(value),
  )
  const isCommunityArtifact = Boolean(
    value && /^\/api\/community-artifacts\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  )
  if (
    !value ||
    (!isPreparedArtifact && !isCommunityArtifact) ||
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
  const isCommunityArtifact = artifactPath.startsWith('/api/community-artifacts/')

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
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#111827] text-white">
      <header className="z-10 shrink-0 border-b border-surface-800 bg-surface-900 px-4 py-4 sm:px-6">
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
              {isCommunityArtifact
                ? 'Community uploads are displayed as script-disabled, visual-only previews.'
                : 'Runs in an opaque-origin sandbox with direct API and external asset access blocked.'}
            </p>
          </div>
          {!isCommunityArtifact && (
            <a
              href={artifactPath}
              download
              className="border border-surface-600 px-3 py-2 text-xs font-bold text-surface-200 transition hover:border-brand-orange hover:text-brand-orange"
            >
              Download HTML
            </a>
          )}
        </div>
      </header>

      <div className="mx-auto min-h-0 w-full max-w-[1600px] flex-1 overflow-auto p-3 sm:p-5">
        <ProtectedArtifactFrame
          selectedPackage={selectedPackage}
          providerName={providerName}
          showOpenAction={false}
          allowArtifactDownloads={!isCommunityArtifact}
          allowArtifactScripts={!isCommunityArtifact}
          frameHeight="calc(100svh - 176px)"
          contextLabel={isCommunityArtifact ? 'Visual-only community preview' : 'Isolated full-page preview'}
          viewerFitControls
        />
      </div>
    </div>
  )
}
