'use client'

import { Fragment, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ExternalLink, FileCode2, GitFork } from 'lucide-react'
import CopyButton from '@/app/prompt/[id]/CopyButton'
import { getProjectRouteOverride } from '@/lib/project-links'
import { buildProjectResponseForkHref, type ProjectForkNetworkItem } from '@/lib/project-forks'

export type SourceRunShowcaseCallout = {
  tone: 'warning' | 'success' | 'neutral'
  title: string
  body: string
}

export type SourceRunShowcaseStep = {
  id: string
  stepNumber: number
  title: string
  prompt: string
  response: string
  responseCopyText?: string
  artifactPath?: string | null
  artifactTitle?: string
  artifactVersions?: SourceRunShowcaseArtifactVersion[]
  callout?: SourceRunShowcaseCallout
}

export type SourceRunShowcaseArtifactVersion = {
  id?: string
  artifactPath: string
  artifactTitle: string
  isDefault?: boolean
}

type ArtifactPackage = Pick<
  SourceRunShowcaseStep,
  'id' | 'stepNumber' | 'title' | 'prompt' | 'response' | 'responseCopyText' | 'callout'
> & {
  stepId: string
  artifactPath: string
  artifactTitle: string
  artifactOrdinal: number
  artifactCount: number
  isDefaultArtifact: boolean
}

type ArtifactSize = {
  width: number
  height: number
}

const ARTIFACT_FRAME_HEIGHT = 'clamp(520px, calc(100svh - 160px), 760px)'
const MAX_AUTO_FIT_ARTIFACT_HEIGHT = 6000
const MAX_AUTO_FIT_ARTIFACT_WIDTH = 14000
const MAX_AUTO_FIT_HTML_BYTES = 2_000_000

function artifactFitProbeScript() {
  return `
<script>
(() => {
  const sendSize = () => {
    const doc = document.documentElement;
    const body = document.body;
    const width = Math.max(doc ? doc.scrollWidth : 0, body ? body.scrollWidth : 0, window.innerWidth);
    const height = Math.max(doc ? doc.scrollHeight : 0, body ? body.scrollHeight : 0, window.innerHeight);
    window.parent.postMessage({ type: 'pathforge-artifact-size', width, height }, '*');
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      sendSize();
    });
  };

  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }
  setTimeout(schedule, 60);
  setTimeout(schedule, 300);
  setTimeout(schedule, 1000);
})();
</script>`
}

function injectArtifactFitProbe(html: string, artifactHref: string) {
  const baseTag = `<base href="${artifactHref}">`
  const hasBaseTag = /<base\s/i.test(html)
  const htmlWithBase = hasBaseTag
    ? html
    : html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
  const probe = artifactFitProbeScript()

  if (/<\/body>/i.test(htmlWithBase)) {
    return htmlWithBase.replace(/<\/body>/i, `${probe}</body>`)
  }

  return `${htmlWithBase}${probe}`
}

function ArtifactFrame({
  selectedPackage,
  providerName,
}: {
  selectedPackage: ArtifactPackage
  providerName: string
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [frameSize, setFrameSize] = useState<ArtifactSize | null>(null)
  const [artifactSize, setArtifactSize] = useState<ArtifactSize | null>(null)
  const [srcDoc, setSrcDoc] = useState<string | null>(null)
  const [usesDirectSource, setUsesDirectSource] = useState(false)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return undefined

    const updateFrameSize = () => {
      const rect = frame.getBoundingClientRect()
      const nextSize = {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      }

      setFrameSize((current) => {
        if (
          current &&
          Math.abs(current.width - nextSize.width) < 2 &&
          Math.abs(current.height - nextSize.height) < 2
        ) {
          return current
        }

        return nextSize
      })
    }

    updateFrameSize()
    const observer = new ResizeObserver(updateFrameSize)
    observer.observe(frame)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    setArtifactSize(null)
    setSrcDoc(null)
    setUsesDirectSource(false)

    async function loadArtifact() {
      try {
        const artifactHref = new URL(selectedPackage.artifactPath, window.location.origin).href
        const response = await fetch(selectedPackage.artifactPath)
        const html = await response.text()

        if (!response.ok || html.length > MAX_AUTO_FIT_HTML_BYTES) {
          if (!cancelled) setUsesDirectSource(true)
          return
        }

        if (!cancelled) {
          setSrcDoc(injectArtifactFitProbe(html, artifactHref))
        }
      } catch {
        if (!cancelled) setUsesDirectSource(true)
      }
    }

    loadArtifact()

    return () => {
      cancelled = true
    }
  }, [selectedPackage.artifactPath, selectedPackage.id])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return
      const data = event.data
      if (!data || data.type !== 'pathforge-artifact-size') return
      const width = Number(data.width)
      const height = Number(data.height)
      if (!Number.isFinite(width) || !Number.isFinite(height)) return

      const nextSize = {
        width: Math.max(1, Math.ceil(width)),
        height: Math.max(1, Math.ceil(height)),
      }

      setArtifactSize((current) => {
        if (
          current &&
          Math.abs(current.width - nextSize.width) < 4 &&
          Math.abs(current.height - nextSize.height) < 4
        ) {
          return current
        }

        return nextSize
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const canAutoFit =
    Boolean(srcDoc && frameSize && artifactSize) &&
    (artifactSize?.height ?? 0) <= MAX_AUTO_FIT_ARTIFACT_HEIGHT &&
    (artifactSize?.width ?? 0) <= MAX_AUTO_FIT_ARTIFACT_WIDTH
  const fitScale = canAutoFit && frameSize && artifactSize
    ? Math.min(
        1,
        frameSize.height / Math.max(artifactSize.height, 1),
        frameSize.width / Math.max(artifactSize.width, 1),
      )
    : 1
  const shouldScale = canAutoFit && fitScale < 0.995
  const virtualWidth = shouldScale && frameSize
    ? Math.ceil(frameSize.width / fitScale)
    : undefined
  const virtualHeight = shouldScale && artifactSize
    ? Math.ceil(artifactSize.height)
    : undefined
  const iframeStyle: CSSProperties = shouldScale
    ? {
        width: `${virtualWidth}px`,
        height: `${virtualHeight}px`,
        transform: `scale(${fitScale})`,
        transformOrigin: 'left top',
        border: 0,
      }
    : {
        width: '100%',
        height: '100%',
        border: 0,
      }
  const fitMode = usesDirectSource
    ? 'direct'
    : canAutoFit
      ? shouldScale ? 'scaled' : 'native'
      : srcDoc ? 'guarded-scroll' : 'loading'

  return (
    <div
      key={selectedPackage.id}
      id="final-result"
      className="overflow-hidden border border-surface-800 bg-[#111827] shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
            Current artifact
          </div>
          <div className="truncate text-sm font-semibold">{selectedPackage.artifactTitle}</div>
          <div className="mt-1 text-xs text-surface-400">
            Prompt {String(selectedPackage.stepNumber).padStart(2, '0')} version from {providerName}
          </div>
        </div>
        <a
          href={selectedPackage.artifactPath}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 border border-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-300 transition hover:border-brand-orange hover:text-brand-orange"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </a>
      </div>
      <div
        ref={frameRef}
        data-artifact-fit-mode={fitMode}
        data-artifact-scale={shouldScale ? fitScale.toFixed(3) : '1'}
        data-artifact-measured-height={artifactSize?.height ?? ''}
        data-artifact-measured-width={artifactSize?.width ?? ''}
        data-artifact-virtual-height={virtualHeight ?? ''}
        data-artifact-virtual-width={virtualWidth ?? ''}
        className="relative w-full overflow-hidden bg-[#111827]"
        style={{ height: ARTIFACT_FRAME_HEIGHT }}
      >
        <iframe
          ref={iframeRef}
          key={selectedPackage.id}
          title={`${selectedPackage.artifactTitle} generated from a ${providerName} source run`}
          src={usesDirectSource || !srcDoc ? selectedPackage.artifactPath : undefined}
          srcDoc={srcDoc ?? undefined}
          sandbox="allow-scripts allow-same-origin"
          scrolling={canAutoFit ? 'no' : 'auto'}
          className="absolute left-0 top-0 max-w-none bg-[#111827]"
          style={iframeStyle}
        />
      </div>
    </div>
  )
}

function PromptText({ text }: { text: string }) {
  return (
    <div className="group/prompt relative pr-9">
      <p className="border-l-2 border-brand-orange pl-3 font-semibold text-surface-900">
        {text}
      </p>
      <div className="absolute right-0 top-0 opacity-70 transition-opacity duration-200 group-hover/prompt:opacity-100 focus-within:opacity-100">
        <CopyButton text={text} variant="ghost" label="Copy prompt" visibleLabel="Copy" />
      </div>
    </div>
  )
}

function compactForkText(value: string | null | undefined, fallback: string, max = 120) {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed
}

function forkProjectHref(fork: ProjectForkNetworkItem) {
  return getProjectRouteOverride(fork.id) ?? `/prompt/${fork.id}`
}

function forkAuthorLabel(fork: ProjectForkNetworkItem) {
  if (fork.authorUsername) return `@${fork.authorUsername}`
  return fork.authorDisplayName ?? compactForkText(fork.title, 'Forked path', 44)
}

function externalSourceRunHref(value?: string | null) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function ResponseForkBranchCard({
  fork,
  isActive = false,
  onSelect,
}: {
  fork: ProjectForkNetworkItem
  isActive?: boolean
  onSelect: (fork: ProjectForkNetworkItem) => void
}) {
  const tooltip = [
    fork.title,
    fork.description,
    fork.modelUsed ? `Model: ${fork.modelUsed}` : null,
  ].filter(Boolean).join('\n')
  const authorLabel = forkAuthorLabel(fork)

  return (
    <button
      type="button"
      onClick={() => onSelect(fork)}
      className={[
        'group/fork-branch-card relative block min-w-0 w-full border bg-white px-3 py-2 text-left transition hover:border-[#07551f] hover:bg-[#effdf3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]',
        isActive ? 'border-[#07551f] bg-[#effdf3] ring-2 ring-[#2bd15f]/30' : 'border-[#07551f]/25',
      ].join(' ')}
      aria-label={`Show fork options for ${authorLabel}`}
      aria-pressed={isActive}
      title={tooltip}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-black text-surface-900 group-hover/fork-branch-card:text-[#07551f]">
          {authorLabel}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#07551f] transition group-hover/fork-branch-card:translate-x-0.5" aria-hidden="true" />
      </span>
      <span className="mt-1 block truncate text-xs leading-5 text-surface-600">
        {compactForkText(fork.description, fork.title, 76)}
      </span>
      <span className="mt-2 block font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#07551f]">
        View branch options
      </span>
    </button>
  )
}

function ResponseForkBranchPanel({
  forks,
  activeForkId,
  onSelectFork,
  compact = false,
}: {
  forks: ProjectForkNetworkItem[]
  activeForkId?: string | null
  onSelectFork: (fork: ProjectForkNetworkItem) => void
  compact?: boolean
}) {
  const hasForks = forks.length > 0
  if (!hasForks) return null

  return (
    <div
      data-response-fork-branch-panel
      className={compact
        ? 'mt-4 grid gap-3'
        : 'grid min-w-0 w-56 shrink-0 gap-3'}
    >
      {hasForks && (
        <div
          className={compact
            ? 'min-w-0 border border-[#07551f]/25 bg-[#f8fff9] p-3'
            : 'min-w-0 border-2 border-[#07551f] bg-[#f8fff9] p-3 shadow-[0_18px_44px_rgba(7,85,31,0.16)]'}
          data-response-fork-destination-panel
        >
          <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#07551f]">
            Forks from this response
          </div>
          <div className="mt-2 grid gap-2">
            {forks.map((fork) => (
              <ResponseForkBranchCard
                key={fork.id}
                fork={fork}
                isActive={activeForkId === fork.id}
                onSelect={onSelectFork}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ResponseForkHoverRail({
  forks,
  activeForkId,
  onSelectFork,
}: {
  forks: ProjectForkNetworkItem[]
  activeForkId?: string | null
  onSelectFork: (fork: ProjectForkNetworkItem) => void
}) {
  const hasForks = forks.length > 0
  if (!hasForks) return <div className="hidden xl:block" aria-hidden="true" />

  return (
    <div
      data-response-fork-hover-rail
      className="hidden min-h-full items-center overflow-visible xl:flex"
    >
      <span
        data-response-fork-socket
        data-response-fork-existing-branch="true"
        className="relative z-10 -ml-6 grid h-12 w-12 shrink-0 place-items-center border-4 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_7px_rgba(43,209,95,0.16)] transition duration-300 motion-safe:animate-pulse group-hover/source-fork-node:shadow-[0_0_0_8px_rgba(43,209,95,0.18)] group-focus-within/source-fork-node:shadow-[0_0_0_8px_rgba(43,209,95,0.18)]"
        aria-hidden="true"
      >
        <span className="h-4 w-4 border-2 border-[#07551f] bg-[#2bd15f]" />
      </span>

      <div className="relative h-12 w-20 shrink-0" data-response-fork-middle-pipe aria-hidden="true">
        <span className="absolute left-0 top-1/2 h-5 w-full origin-left -translate-y-1/2 scale-x-0 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.2),inset_0_-5px_0_rgba(0,0,0,0.16)] transition-transform duration-300 scale-x-100 group-hover/source-fork-node:scale-x-100 group-focus-within/source-fork-node:scale-x-100" />
        <span className="absolute right-[-2px] top-1/2 h-9 w-9 -translate-y-1/2 border-4 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_6px_rgba(43,209,95,0.16)]" />
      </div>

      <div className="-translate-x-2">
        <ResponseForkBranchPanel
          forks={forks}
          activeForkId={activeForkId}
          onSelectFork={onSelectFork}
        />
      </div>
    </div>
  )
}

function PipeNode({
  eyebrow,
  title,
  children,
  terminal = false,
  variant = 'prompt',
  selected = false,
  forkHref,
  forkLabel,
  forks = [],
  activeForkId,
  onSelectFork,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  terminal?: boolean
  variant?: 'prompt' | 'response'
  selected?: boolean
  forkHref?: string
  forkLabel?: string
  forks?: ProjectForkNetworkItem[]
  activeForkId?: string | null
  onSelectFork?: (fork: ProjectForkNetworkItem) => void
}) {
  const cardClassName = [
    'relative border bg-white p-5 shadow-[0_18px_44px_rgba(24,24,27,0.07)]',
    variant === 'response' && selected
      ? 'border-brand-blue ring-2 ring-brand-blue/25'
      : 'border-surface-200',
  ].join(' ')
  const canFork = variant === 'response' && Boolean(forkHref)
  const hasExistingForks = forks.length > 0
  const articleClassName = 'group/source-fork-node relative pl-[88px]'

  return (
    <article className={articleClassName} data-source-run-node={variant}>
      {!terminal && (
        <div className="absolute left-[22px] top-[80px] h-[calc(100%+30px)] w-8 border-x-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_5px_0_0_rgba(255,255,255,0.24),inset_-5px_0_0_rgba(0,0,0,0.2)]" />
      )}
      <div className="absolute left-0 top-8 h-16 w-12 border-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_6px_0_0_rgba(255,255,255,0.28),inset_-6px_0_0_rgba(0,0,0,0.18)]" />
      <div className="absolute left-11 top-[54px] h-7 w-12 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)]" />
      <div className={cardClassName}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-surface-500">
              {eyebrow}
            </div>
            <h3 className="mt-2 text-xl font-black text-surface-900">{title}</h3>
          </div>
          {canFork && forkHref && (
            <Link
              href={forkHref}
              data-response-fork-top-action
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-[#07551f] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#07551f] transition hover:bg-[#effdf3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]"
              aria-label={forkLabel}
            >
              <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
              Fork here
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        <div className="mt-4 text-sm leading-6 text-surface-700">{children}</div>
        {canFork && forkHref && hasExistingForks && onSelectFork && (
          <div className="relative xl:hidden">
            <span className="absolute left-0 top-8 h-2 w-8 -translate-y-1/2 border-y border-[#07551f] bg-[#2bd15f]" aria-hidden="true" />
            <span className="absolute left-6 top-8 h-4 w-4 -translate-y-1/2 border-2 border-[#07551f] bg-white" aria-hidden="true" />
            <div className="pl-9">
              <ResponseForkBranchPanel
                forks={forks}
                activeForkId={activeForkId}
                onSelectFork={onSelectFork}
                compact
              />
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function ResponseForkFocusStage({
  fork,
  forkHref,
  sourceStep,
  steps,
  onClose,
}: {
  fork: ProjectForkNetworkItem
  forkHref: string
  sourceStep: SourceRunShowcaseStep
  steps: SourceRunShowcaseStep[]
  onClose: () => void
}) {
  const forkHrefTarget = forkProjectHref(fork)
  const sharedSteps = steps.filter((step) => step.stepNumber <= sourceStep.stepNumber)
  const laterSteps = steps.filter((step) => step.stepNumber > sourceStep.stepNumber)

  return (
    <div data-response-fork-focus-stage className="relative">
      <div className="grid gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="relative pl-[58px]">
          <div className="absolute left-[22px] top-8 h-[calc(100%-32px)] w-8 border-x-4 border-[#07551f] bg-[#2bd15f] opacity-55 shadow-[inset_5px_0_0_rgba(255,255,255,0.22),inset_-5px_0_0_rgba(0,0,0,0.16)]" />
          <div className="absolute left-0 top-4 h-14 w-12 border-4 border-[#07551f] bg-[#2bd15f] opacity-75 shadow-[inset_6px_0_0_rgba(255,255,255,0.25),inset_-6px_0_0_rgba(0,0,0,0.14)]" />
          <div className="relative border border-[#07551f]/25 bg-white p-3 shadow-[0_16px_38px_rgba(24,24,27,0.06)]">
            <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#07551f]">
              Shared path collapsed left
            </div>
            <div className="mt-3 grid gap-2">
              {sharedSteps.map((step) => (
                <div key={step.id} className="grid gap-1.5">
                  <div
                    className="border border-[#07551f]/20 bg-[#f8fff9] px-2.5 py-2 transition hover:border-[#07551f] hover:bg-[#effdf3]"
                    title={step.prompt}
                  >
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#07551f]">
                      Prompt {String(step.stepNumber).padStart(2, '0')}
                    </div>
                    <div className="mt-1 truncate text-xs font-black text-surface-900">
                      {step.title}
                    </div>
                  </div>
                  <div
                    className={[
                      'border px-2.5 py-2 transition hover:border-[#07551f] hover:bg-[#effdf3]',
                      step.id === sourceStep.id ? 'border-[#07551f] bg-[#effdf3]' : 'border-surface-200 bg-surface-50',
                    ].join(' ')}
                    title={step.response}
                  >
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-surface-500">
                      Response {String(step.stepNumber).padStart(2, '0')}
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-surface-700">
                      {step.id === sourceStep.id ? 'Fork point' : compactForkText(step.response, step.title, 52)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {laterSteps.length > 0 && (
              <div className="mt-3 border border-dashed border-surface-300 bg-surface-50 px-2.5 py-2 text-xs leading-5 text-surface-500">
                Original continuation after response {String(sourceStep.stepNumber).padStart(2, '0')} is muted while this branch is in focus.
              </div>
            )}
          </div>
        </aside>

        <div className="relative min-h-[360px] overflow-visible border-2 border-[#07551f] bg-[#f8fff9] p-4 shadow-[0_22px_70px_rgba(7,85,31,0.18)]">
          <div className="absolute left-[-44px] top-1/2 hidden h-5 w-16 -translate-y-1/2 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.2),inset_0_-5px_0_rgba(0,0,0,0.16)] xl:block" aria-hidden="true" />
          <div className="grid h-full gap-4 xl:grid-cols-[190px_minmax(0,1fr)]">
            <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden border border-[#07551f]/25 bg-white">
              <div
                className="absolute left-0 right-0 top-1/2 h-5 -translate-y-1/2 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.2),inset_0_-5px_0_rgba(0,0,0,0.16)]"
                aria-hidden="true"
              />
              <div className="relative z-10 border-4 border-[#07551f] bg-white px-4 py-3 text-center shadow-[0_0_0_8px_rgba(43,209,95,0.18)]">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#07551f]">
                  Response {String(sourceStep.stepNumber).padStart(2, '0')}
                </div>
                <div className="mt-1 text-sm font-black text-surface-900">
                  Fork point
                </div>
              </div>
            </div>

            <div className="border-2 border-[#07551f] bg-white p-4">
              <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#07551f]">
                Active branch options
              </div>
              <h4 className="mt-2 text-2xl font-black text-surface-900">{fork.title}</h4>
              {fork.description && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">
                  {fork.description}
                </p>
              )}
              {fork.modelUsed && (
                <div className="mt-3 inline-flex border border-surface-200 bg-surface-50 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600">
                  {fork.modelUsed}
                </div>
              )}
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Link
                  href={forkHrefTarget}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[#07551f] bg-[#07551f] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#0b6b29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]"
                >
                  Open fork
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href={`${forkHrefTarget}#source-run-path`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[#07551f] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#07551f] transition hover:bg-[#effdf3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]"
                >
                  <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Code explain
                </Link>
                <Link
                  href={forkHref}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[#07551f] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#07551f] transition hover:bg-[#effdf3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]"
                >
                  <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
                  New fork
                </Link>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 border border-surface-300 px-3 py-2 text-xs font-bold text-surface-600 transition hover:border-[#07551f] hover:text-[#07551f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]"
              >
                Close branch view
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExactResponseBlock({
  text,
  copyText,
}: {
  text: string
  copyText: string
}) {
  return (
    <details className="group/response border border-surface-200 bg-surface-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-white px-4 py-3">
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model response
        </span>
        <span className="shrink-0 border border-surface-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600 group-open/response:hidden">
          View
        </span>
        <span className="hidden shrink-0 border border-surface-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600 group-open/response:inline-block">
          Hide
        </span>
      </summary>
      <div className="flex items-center justify-end border-t border-surface-200 bg-white px-4 py-2">
        <CopyButton text={copyText} variant="ghost" label="Copy response" visibleLabel="Copy" />
      </div>
      <pre className="max-h-[360px] whitespace-pre-wrap overflow-auto p-4 text-sm leading-7 text-surface-900">
        {text}
      </pre>
    </details>
  )
}

function ResponsePackageCard({
  step,
  artifactPackages,
  selectedPackage,
  onSelect,
}: {
  step: SourceRunShowcaseStep
  artifactPackages: ArtifactPackage[]
  selectedPackage?: ArtifactPackage
  onSelect?: (packageId: string) => void
}) {
  const copyText = step.responseCopyText ?? step.response
  const hasArtifactPackages = artifactPackages.length > 0
  const selected = Boolean(selectedPackage)
  const detailPackage = selectedPackage ?? artifactPackages[0]
  const canSelectPackage = Boolean(detailPackage && onSelect)
  const selectLabel = selected ? 'Selected' : 'Select artifact'
  const headerContent = (
    <>
      <div className="min-w-0">
        <div className="block font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Artifact
        </div>
        <div className="mt-1 block text-sm font-semibold leading-6 text-surface-900">
          {hasArtifactPackages
            ? detailPackage?.artifactTitle
            : 'No artifact produced'}
        </div>
      </div>
      {detailPackage && (
        <span
          className={[
            'inline-flex shrink-0 items-center gap-1.5 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]',
            selected
              ? 'border-brand-blue bg-brand-blue text-white'
              : 'border-surface-300 bg-white text-surface-700',
          ].join(' ')}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
          {selectLabel}
        </span>
      )}
    </>
  )

  return (
    <div className="space-y-4">
      {canSelectPackage ? (
        <button
          type="button"
          onClick={() => onSelect?.(detailPackage.id)}
          aria-pressed={selected}
          className={[
            'flex w-full items-start justify-between gap-4 border p-4 text-left transition hover:bg-brand-blue/5',
            selected ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-200 bg-surface-50',
          ].join(' ')}
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex w-full items-start justify-between gap-4 border border-surface-200 bg-surface-50 p-4 text-left">
          {headerContent}
        </div>
      )}

      <div className="space-y-4 bg-white">
        {detailPackage ? (
          <div className="border border-surface-200 bg-surface-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <a
                href={detailPackage.artifactPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border-b border-surface-400 text-sm font-semibold text-surface-900 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Open artifact
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {artifactPackages.length > 1 && onSelect && (
                <div className="flex flex-wrap gap-2">
                {artifactPackages.map((pkg) => {
                  const packageSelected = selectedPackage?.id === pkg.id
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => onSelect(pkg.id)}
                      aria-pressed={packageSelected}
                      className={[
                        'border px-2.5 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.12em]',
                        packageSelected
                          ? 'border-brand-blue bg-brand-blue text-white'
                          : 'border-surface-300 bg-white text-surface-700 hover:border-brand-blue',
                      ].join(' ')}
                    >
                      Version {pkg.artifactOrdinal}
                    </button>
                  )
                })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-surface-200 bg-surface-50 px-4 py-3 text-sm leading-6 text-surface-700">
            No mountable artifact is attached to this response package.
          </div>
        )}

        <ExactResponseBlock text={step.response} copyText={copyText} />
      </div>
    </div>
  )
}

export default function SourceRunShowcase({
  sourceRunUrl,
  projectId,
  projectTitle,
  providerName,
  steps,
  forkNetwork = [],
  defaultStepNumber,
}: {
  sourceRunUrl?: string | null
  projectId?: string
  projectTitle?: string
  providerName: string
  steps: SourceRunShowcaseStep[]
  forkNetwork?: ProjectForkNetworkItem[]
  defaultStepNumber?: number
}) {
  const sourceRunHref = externalSourceRunHref(sourceRunUrl)
  const packages = useMemo(
    () =>
      steps.flatMap((step) => {
        const explicitVersions = (step.artifactVersions ?? []).filter((version) => (
          !!version.artifactPath &&
          !!version.artifactTitle
        ))

        if (explicitVersions.length > 0) {
          return explicitVersions.map((version, index) => ({
            id: version.id ?? `${step.id}-artifact-${index + 1}`,
            stepId: step.id,
            stepNumber: step.stepNumber,
            title: step.title,
            prompt: step.prompt,
            response: step.response,
            responseCopyText: step.responseCopyText,
            callout: step.callout,
            artifactPath: version.artifactPath,
            artifactTitle: version.artifactTitle,
            artifactOrdinal: index + 1,
            artifactCount: explicitVersions.length,
            isDefaultArtifact: Boolean(version.isDefault),
          }))
        }

        if (!step.artifactPath || !step.artifactTitle) {
          return []
        }

        return [{
          id: step.id,
          stepId: step.id,
          stepNumber: step.stepNumber,
          title: step.title,
          prompt: step.prompt,
          response: step.response,
          responseCopyText: step.responseCopyText,
          callout: step.callout,
          artifactPath: step.artifactPath,
          artifactTitle: step.artifactTitle,
          artifactOrdinal: 1,
          artifactCount: 1,
          isDefaultArtifact: false,
        }]
      }),
    [steps],
  )
  const defaultStepPackages = packages.filter((pkg) => pkg.stepNumber === defaultStepNumber)
  const defaultPackage =
    packages.find((pkg) => pkg.isDefaultArtifact) ??
    defaultStepPackages[defaultStepPackages.length - 1] ??
    packages[packages.length - 1]
  const [selectedPackageId, setSelectedPackageId] = useState(defaultPackage?.id ?? '')
  const [activeForkId, setActiveForkId] = useState<string | null>(null)
  const activeForkStageRef = useRef<HTMLDivElement | null>(null)
  const selectedPackage =
    packages.find((pkg) => pkg.id === selectedPackageId) ?? defaultPackage ?? packages[0]
  const forkBranchesByStepId = useMemo(() => {
    const branches = new Map<string, ProjectForkNetworkItem[]>()

    for (const step of steps) {
      branches.set(
        step.id,
        forkNetwork.filter((fork) => (
          fork.forkSource.sourceStepId === step.id ||
          fork.forkSource.sourceStepNumber === step.stepNumber
        )),
      )
    }

    return branches
  }, [forkNetwork, steps])
  const activeForkContext = useMemo(() => {
    if (!activeForkId || !projectId) return null

    for (const step of steps) {
      const fork = (forkBranchesByStepId.get(step.id) ?? []).find((branch) => branch.id === activeForkId)
      if (!fork) continue

      const forkHref = buildProjectResponseForkHref({
        sourceProjectId: projectId,
        sourceProjectTitle: projectTitle,
        sourceStepId: step.id,
        sourceStepNumber: step.stepNumber,
        promptFamilyId: `${projectId}:${step.id}`,
      })
      if (!forkHref) return null

      return {
        fork,
        sourceStep: step,
        forkHref,
      }
    }

    return null
  }, [activeForkId, forkBranchesByStepId, projectId, projectTitle, steps])
  const hasForkLane = forkNetwork.length > 0
  const pathRowClassName = hasForkLane
    ? 'grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]'
    : undefined

  useEffect(() => {
    if (!activeForkContext) return
    activeForkStageRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [activeForkContext])

  return (
    <>
      {selectedPackage && (
        <section className="border-b border-surface-200 bg-surface-50 px-4 pb-9 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <ArtifactFrame selectedPackage={selectedPackage} providerName={providerName} />
          </div>
        </section>
      )}

      <section id="source-run-path" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7 border-l-4 border-[#2bd15f] pl-4">
          <h2 className="text-3xl font-black text-surface-900">
            Build path
          </h2>
        </div>

        {activeForkContext ? (
          <div ref={activeForkStageRef}>
            <ResponseForkFocusStage
              fork={activeForkContext.fork}
              forkHref={activeForkContext.forkHref}
              sourceStep={activeForkContext.sourceStep}
              steps={steps}
              onClose={() => setActiveForkId(null)}
            />
          </div>
        ) : (
          <div className="space-y-7">
            {steps.map((step, index) => {
              const artifactPackages = packages.filter((pkg) => pkg.stepId === step.id)
              const selectedStepPackage = artifactPackages.find((pkg) => selectedPackage?.id === pkg.id)
              const forkHref = projectId
                ? buildProjectResponseForkHref({
                  sourceProjectId: projectId,
                  sourceProjectTitle: projectTitle,
                  sourceStepId: step.id,
                  sourceStepNumber: step.stepNumber,
                  promptFamilyId: `${projectId}:${step.id}`,
                })
                : null
              const stepForks = forkBranchesByStepId.get(step.id) ?? []

              return (
                <Fragment key={step.id}>
                  <div className={pathRowClassName}>
                    <PipeNode
                      eyebrow={`Prompt ${String(step.stepNumber).padStart(2, '0')}`}
                      title={step.title}
                      terminal={false}
                      variant="prompt"
                    >
                      <PromptText text={step.prompt} />
                    </PipeNode>
                    {hasForkLane && <div className="hidden xl:block" aria-hidden="true" />}
                  </div>

                  <div className={pathRowClassName}>
                    <PipeNode
                      eyebrow={`Response ${String(step.stepNumber).padStart(2, '0')}`}
                      title={step.title}
                      terminal={index === steps.length - 1}
                      variant="response"
                      selected={Boolean(selectedStepPackage)}
                      forkHref={forkHref ?? undefined}
                      forkLabel={`Fork ${projectTitle ?? 'this path'} from response ${String(step.stepNumber).padStart(2, '0')}`}
                      forks={stepForks}
                      activeForkId={activeForkId}
                      onSelectFork={(fork) => setActiveForkId(fork.id)}
                    >
                    <ResponsePackageCard
                      step={step}
                      artifactPackages={artifactPackages}
                      selectedPackage={selectedStepPackage}
                      onSelect={artifactPackages.length > 0 ? setSelectedPackageId : undefined}
                    />
                    </PipeNode>
                    {hasForkLane && (
                      <ResponseForkHoverRail
                        forks={stepForks}
                        activeForkId={activeForkId}
                        onSelectFork={(fork) => setActiveForkId(fork.id)}
                      />
                    )}
                  </div>
                </Fragment>
              )
            })}
          </div>
        )}

        <div className="mt-8 border border-surface-200 bg-white p-4">
          {sourceRunHref ? (
            <a
              href={sourceRunHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
            >
              Source run
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-surface-700">
              <span className="font-semibold text-surface-900">Source run</span>
              <span>Local approval draft; provider link has not been captured yet.</span>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
