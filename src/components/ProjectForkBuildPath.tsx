'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  FileCode2,
  GitBranch,
  GitFork,
  X,
} from 'lucide-react'
import type {
  ProjectForkArtifactVersion,
  ProjectForkContinuationStep,
  ProjectForkNetworkItem,
  ProjectForkSource,
  ProjectForkSourceStep,
} from '@/lib/project-forks'
import { resolveProjectForkPoint } from '@/lib/project-forks'

export type ProjectForkBuildPathMode = 'parent' | 'child'

export type ProjectForkBuildPathCrumb = {
  id: string
  title: string
  href?: string | null
  modelLabel?: string | null
  isCurrent?: boolean
}

export type ProjectForkBuildPathArtifact = ProjectForkArtifactVersion & {
  stepId: string
  stepNumber: number
}

export type ProjectForkBuildPathProps = {
  mode?: ProjectForkBuildPathMode
  sourceSteps: ProjectForkSourceStep[]
  forkSource?: ProjectForkSource
  branch: ProjectForkNetworkItem
  trail?: ProjectForkBuildPathCrumb[]
  sourceProjectHref?: string | null
  branchHref?: string | null
  newForkHref?: string | null
  sourceRunHref?: string | null
  selectedArtifactPath?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  onClose?: () => void
  onDisplayArtifact?: (artifactPath: string, artifactTitle: string, artifactId: string) => void
  className?: string
}

function compactText(value: string | null | undefined, fallback: string, max: number) {
  const normalized = value?.trim()
  if (!normalized) return fallback
  return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized
}

function stepLabel(stepNumber: number) {
  return String(stepNumber).padStart(2, '0')
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href)
}

function ActionLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string
  children: React.ReactNode
  className: string
  ariaLabel?: string
}) {
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  )
}

function continuationArtifacts(step: ProjectForkContinuationStep): ProjectForkBuildPathArtifact[] {
  const versions = [...(step.artifactVersions ?? [])]

  if (
    step.artifactPath &&
    !versions.some((version) => version.artifactPath === step.artifactPath)
  ) {
    versions.push({
      id: `${step.id}:artifact`,
      artifactPath: step.artifactPath,
      artifactTitle: `${step.promptTitle} artifact`,
      isDefault: versions.length === 0,
    })
  }

  return versions.map((version) => ({
    ...version,
    stepId: step.id,
    stepNumber: step.stepNumber,
  }))
}

function artifactViewerHref(
  artifact: ProjectForkBuildPathArtifact,
  providerName?: string | null,
) {
  const query = new URLSearchParams({
    path: artifact.artifactPath,
    title: artifact.artifactTitle,
  })
  if (providerName?.trim()) query.set('provider', providerName.trim())
  return `/artifact-viewer?${query.toString()}`
}

function ExactText({
  label,
  text,
  subtle = false,
}: {
  label: string
  text?: string | null
  subtle?: boolean
}) {
  const normalized = text?.trim()
  if (!normalized) return null

  return (
    <details
      className={[
        'group/exact overflow-hidden border',
        subtle ? 'border-surface-200 bg-white' : 'border-surface-200 bg-surface-50',
      ].join(' ')}
    >
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-bold text-surface-700 marker:content-none hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange">
        <span>{label}</span>
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform group-open/exact:rotate-90"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-inherit px-3 py-3 text-sm leading-6 text-surface-700 whitespace-pre-wrap break-words">
        {normalized}
      </div>
    </details>
  )
}

function InheritedStepCard({
  step,
  isForkPoint,
}: {
  step: ProjectForkSourceStep
  isForkPoint: boolean
}) {
  return (
    <article className="grid gap-2" data-fork-inherited-step={step.id}>
      <div className="border border-surface-200 border-l-2 border-l-brand-orange bg-white px-3 py-2.5">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-brand-orange-ink">
          Prompt {stepLabel(step.stepNumber)}
        </div>
        <div className="mt-1 text-xs font-black leading-5 text-surface-900">
          {compactText(step.promptTitle, `Prompt ${step.stepNumber}`, 70)}
        </div>
        <div className="mt-2">
          <ExactText label="Show exact prompt" text={step.promptText} subtle />
        </div>
      </div>

      <div
        className={[
          'border px-3 py-2.5',
          isForkPoint
            ? 'border-brand-orange bg-primary-50 ring-2 ring-brand-orange/15'
            : 'border-surface-200 bg-surface-50',
        ].join(' ')}
        data-fork-source-response={isForkPoint ? 'true' : undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-surface-500">
            Response {stepLabel(step.stepNumber)}
          </span>
          {isForkPoint && (
            <span className="border border-brand-orange/40 bg-white px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-brand-orange-ink">
              Exact fork point
            </span>
          )}
        </div>
        <p className="mt-1 text-xs font-bold leading-5 text-surface-700">
          {isForkPoint
            ? 'This response created the branch shown here.'
            : compactText(step.responseText, 'Captured response', 86)}
        </p>
        <div className="mt-2">
          <ExactText label="Show exact response" text={step.responseText} subtle />
        </div>
      </div>
    </article>
  )
}

function InheritedPath({
  steps,
  forkPointId,
}: {
  steps: ProjectForkSourceStep[]
  forkPointId?: string
}) {
  const forkPointIndex = steps.findIndex((step) => step.id === forkPointId)
  const forkPoint = forkPointIndex >= 0 ? steps[forkPointIndex] : steps.at(-1)
  const earlierSteps = forkPoint
    ? steps.filter((step) => step.id !== forkPoint.id)
    : steps

  return (
    <div className="grid gap-3">
      {earlierSteps.length > 0 && (
        <details className="group/history border border-surface-200 bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:content-none hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange">
            <span>
              <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-surface-500">
                Earlier inherited history
              </span>
              <span className="mt-0.5 block text-xs font-bold text-surface-700">
                {earlierSteps.length} prompt-response pair{earlierSteps.length === 1 ? '' : 's'} before the fork point
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open/history:rotate-90" aria-hidden="true" />
          </summary>
          <div className="grid gap-3 border-t border-surface-200 bg-surface-50 p-3 md:grid-cols-2">
            {earlierSteps.map((step) => (
              <InheritedStepCard key={step.id} step={step} isForkPoint={false} />
            ))}
          </div>
        </details>
      )}
      {forkPoint && (
        <InheritedStepCard
          key={forkPoint.id}
          step={forkPoint}
          isForkPoint={forkPoint.id === forkPointId}
        />
      )}
    </div>
  )
}

function AncestryTrail({ ancestry }: { ancestry: ProjectForkBuildPathCrumb[] }) {
  if (ancestry.length === 0) return null

  return (
    <nav aria-label="Fork lineage" className="border-b border-surface-200 bg-surface-50 px-4 py-3 sm:px-5">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-surface-600">
        {ancestry.map((crumb, index) => (
          <li key={crumb.id} className="flex min-w-0 items-center gap-2">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden="true" />}
            {crumb.href && !crumb.isCurrent ? (
              <ActionLink
                href={crumb.href}
                className="max-w-48 truncate font-bold hover:text-brand-orange-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                {crumb.title}
              </ActionLink>
            ) : (
              <span
                className={[
                  'max-w-48 truncate',
                  crumb.isCurrent ? 'font-black text-surface-900' : 'font-bold',
                ].join(' ')}
                aria-current={crumb.isCurrent ? 'page' : undefined}
              >
                {crumb.title}
              </span>
            )}
            {crumb.modelLabel && (
              <span className="hidden border border-surface-200 bg-surface-50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-surface-500 sm:inline">
                {crumb.modelLabel}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function ArtifactActions({
  artifacts,
  providerName,
  artifactOpenHrefs,
  selectedArtifactPath,
  onDisplayArtifact,
}: {
  artifacts: ProjectForkBuildPathArtifact[]
  providerName?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  selectedArtifactPath?: string | null
  onDisplayArtifact?: (artifactPath: string, artifactTitle: string, artifactId: string) => void
}) {
  if (artifacts.length === 0) return null

  return (
    <div className="mt-4 grid gap-2" aria-label="Artifact versions">
      {artifacts.map((artifact) => {
        const isSelected = selectedArtifactPath === artifact.artifactPath
        const openHref = artifactOpenHrefs?.[artifact.artifactPath]
          ?? artifactViewerHref(artifact, providerName)

        return (
          <div
            key={`${artifact.stepId}:${artifact.id}:${artifact.artifactPath}`}
            className={[
              'grid gap-2 border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
              isSelected
                ? 'border-brand-blue bg-brand-blue/5'
                : 'border-surface-200 bg-surface-50',
            ].join(' ')}
          >
            <div className="min-w-0">
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-surface-500">
                Artifact {artifact.isDefault ? '· Default' : ''}
              </div>
              <div className="mt-1 truncate text-sm font-black text-surface-900">
                {artifact.artifactTitle}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {onDisplayArtifact && (
                <button
                  type="button"
                  onClick={() => onDisplayArtifact(
                    artifact.artifactPath,
                    artifact.artifactTitle,
                    artifact.id,
                  )}
                  data-fork-display-artifact={artifact.artifactPath}
                  aria-pressed={isSelected}
                  className={[
                    'inline-flex min-h-10 items-center justify-center border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue',
                    isSelected
                      ? 'border-brand-blue bg-brand-blue text-white'
                      : 'border-surface-300 bg-white text-surface-700 hover:border-brand-orange hover:text-brand-orange-ink',
                  ].join(' ')}
                >
                  {isSelected ? 'Displayed here' : 'Display artifact here'}
                </button>
              )}
              <ActionLink
                href={openHref}
                ariaLabel={`Open ${artifact.artifactTitle}`}
                className="inline-flex min-h-10 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-surface-700 transition hover:border-brand-orange hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                Open
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </ActionLink>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContinuationStepCard({
  step,
  providerName,
  artifactOpenHrefs,
  selectedArtifactPath,
  onDisplayArtifact,
}: {
  step: ProjectForkContinuationStep
  providerName?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  selectedArtifactPath?: string | null
  onDisplayArtifact?: (artifactPath: string, artifactTitle: string, artifactId: string) => void
}) {
  const artifacts = continuationArtifacts(step)

  return (
    <article
      className="border border-surface-200 bg-white p-4 shadow-[0_18px_44px_rgba(24,24,27,0.07)] sm:p-5"
      data-fork-continuation={step.id}
    >
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange-ink">
        Prompt {stepLabel(step.stepNumber)} · Fork continuation
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h4 className="text-lg font-black text-surface-900">{step.promptTitle}</h4>
        {step.forkHref && (
          <Link
            href={step.forkHref}
            aria-label={`Fork this branch from response ${stepLabel(step.stepNumber)}`}
            data-fork-continuation-fork={step.id}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-brand-orange bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-brand-orange-ink transition hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
            Fork here
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="mt-3">
        <ExactText label="Show exact prompt" text={step.promptText} />
      </div>

      <div className="mt-4 border-l-2 border-brand-orange bg-surface-50 p-3 sm:p-4">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-500">
          Response {stepLabel(step.stepNumber)}
        </div>
        <p className="mt-2 text-sm font-bold leading-6 text-surface-700">
          {compactText(step.responseText, 'The complete response is preserved in this branch.', 180)}
        </p>
        <div className="mt-3">
          <ExactText label="Show exact response" text={step.responseText} />
        </div>
      </div>

      <ArtifactActions
        artifacts={artifacts}
        providerName={providerName}
        artifactOpenHrefs={artifactOpenHrefs}
        selectedArtifactPath={selectedArtifactPath}
        onDisplayArtifact={onDisplayArtifact}
      />
    </article>
  )
}

export function ProjectForkBuildPath({
  mode = 'parent',
  sourceSteps,
  forkSource,
  branch,
  trail = [],
  sourceProjectHref,
  branchHref,
  newForkHref,
  sourceRunHref,
  selectedArtifactPath,
  artifactOpenHrefs,
  onClose,
  onDisplayArtifact,
  className = '',
}: ProjectForkBuildPathProps) {
  const fork = forkSource ? { ...branch, forkSource } : branch
  const forkPoint = resolveProjectForkPoint(sourceSteps, fork.forkSource)
  const forkPointIndex = forkPoint
    ? sourceSteps.findIndex((step) => step.id === forkPoint.id)
    : -1
  const visibleInheritedSteps = forkPointIndex >= 0
    ? sourceSteps.slice(0, forkPointIndex + 1)
    : sourceSteps
  const continuationSteps = fork.continuationSteps ?? []
  const branchTarget = branchHref ?? fork.childRoute ?? null
  const forkNumber = fork.forkSource.sourceStepNumber
  const label = mode === 'child' ? 'Fork build path' : 'Selected branch'
  const desktopPathRef = useRef<HTMLDivElement | null>(null)
  const [forkSocket, setForkSocket] = useState<{ stepId: string; y: number } | null>(null)

  useEffect(() => {
    const desktopPath = desktopPathRef.current
    if (!desktopPath || !forkPoint) {
      return undefined
    }

    const forkResponse = desktopPath.querySelector<HTMLElement>(
      '[data-fork-source-response="true"]',
    )
    if (!forkResponse) {
      return undefined
    }

    const alignSocket = () => {
      const pathRect = desktopPath.getBoundingClientRect()
      const responseRect = forkResponse.getBoundingClientRect()
      const responseCenter = responseRect.top - pathRect.top + responseRect.height / 2
      const clampedCenter = Math.max(28, Math.min(pathRect.height - 28, responseCenter))
      setForkSocket((current) => (
        current?.stepId === forkPoint.id && Math.abs(current.y - clampedCenter) < 0.5
          ? current
          : { stepId: forkPoint.id, y: clampedCenter }
      ))
    }

    alignSocket()
    const observer = new ResizeObserver(alignSocket)
    observer.observe(desktopPath)
    observer.observe(forkResponse)
    window.addEventListener('resize', alignSocket)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', alignSocket)
    }
  }, [fork.id, forkPoint])

  return (
    <section
      className={[
        'overflow-hidden border border-surface-200 bg-white shadow-[0_18px_44px_rgba(24,24,27,0.07)]',
        className,
      ].join(' ')}
      data-project-fork-build-path
      data-project-fork-build-path-mode={mode}
      aria-labelledby={`fork-build-path-${fork.id}`}
    >
      <AncestryTrail ancestry={trail} />

      <header className="grid gap-4 border-b border-surface-200 bg-white p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            {label}
          </div>
          <h3 id={`fork-build-path-${fork.id}`} className="mt-2 text-2xl font-black text-surface-900">
            {fork.title}
          </h3>
          {fork.description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">
              {fork.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {fork.modelUsed && (
              <span className="border border-surface-200 bg-surface-50 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-surface-600">
                {fork.modelUsed}
              </span>
            )}
            <span className="border border-brand-orange/30 bg-primary-50 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-orange-ink">
              Depth {fork.forkSource.depth} · Branch {fork.forkSource.branchIndex}
            </span>
            {forkNumber !== undefined && (
              <span className="border border-surface-200 bg-white px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-surface-600">
                From response {stepLabel(forkNumber)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
          {sourceProjectHref && (
            <ActionLink
              href={sourceProjectHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-surface-700 transition hover:border-brand-orange hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              Source path
            </ActionLink>
          )}
          {branchTarget && mode === 'parent' && (
            <ActionLink
              href={branchTarget}
              className="inline-flex min-h-10 items-center justify-center gap-2 bg-surface-900 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-surface-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              Open fork
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </ActionLink>
          )}
          {sourceRunHref && (
            <ActionLink
              href={sourceRunHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-surface-700 transition hover:border-brand-orange hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
              Source run
            </ActionLink>
          )}
          {newForkHref && (
            <ActionLink
              href={newForkHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-brand-orange bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-brand-orange-ink transition hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
              New fork
            </ActionLink>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-surface-600 transition hover:border-brand-orange hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              aria-label="Close selected fork branch"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Close
            </button>
          )}
        </div>
      </header>

      <div className="p-4 sm:p-5">
        <details className="group/inherited mb-4 border border-surface-200 bg-white lg:hidden" data-fork-inherited-path>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange">
            <span>
              <span className="block font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange-ink">
                Inherited source path
              </span>
              <span className="mt-1 block text-sm font-bold text-surface-700">
                {visibleInheritedSteps.length} prompt-response pair{visibleInheritedSteps.length === 1 ? '' : 's'} through the fork point
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-brand-orange transition-transform group-open/inherited:rotate-90" aria-hidden="true" />
          </summary>
          <div className="border-t border-surface-200 p-3">
            <InheritedPath steps={visibleInheritedSteps} forkPointId={forkPoint?.id} />
          </div>
        </details>

        <div
          ref={desktopPathRef}
          className="relative grid gap-5"
          data-fork-desktop-path
        >
          <aside className="relative hidden border border-surface-200 bg-surface-50 p-4 lg:block" data-fork-inherited-path>
            <div className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange-ink">
              Inherited source path
            </div>
            <InheritedPath steps={visibleInheritedSteps} forkPointId={forkPoint?.id} />
          </aside>

          {forkPoint && (
            <div
              className={[
                'pointer-events-none absolute -left-1 hidden h-10 w-1 -translate-y-1/2 bg-brand-orange transition-[top,opacity] duration-150 lg:block',
                forkSocket?.stepId === forkPoint.id ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
              style={{ top: forkSocket?.stepId === forkPoint.id ? forkSocket.y : '50%' }}
              data-fork-response-connector
              data-fork-response-connector-step={forkPoint.id}
              aria-hidden="true"
            />
          )}

          <div className="min-w-0 border border-surface-200 bg-surface-50 p-3 sm:p-4">
            <div className="mb-4 border-b border-surface-200 pb-3">
              <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange-ink">
                Active fork continuation
              </div>
              <p className="mt-1 text-sm leading-6 text-surface-600">
                The inherited work stays attached for context while this branch takes the primary workspace.
              </p>
            </div>

            {!forkPoint && (
              <div className="mb-4 border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900" role="status">
                The recorded source response is not available in this run. The branch is shown without inventing a fallback fork point.
              </div>
            )}

            {continuationSteps.length > 0 ? (
              <div className="grid gap-4">
                {continuationSteps.map((step) => (
                  <ContinuationStepCard
                    key={step.id}
                    step={step}
                    providerName={fork.childProviderName}
                    artifactOpenHrefs={artifactOpenHrefs}
                    selectedArtifactPath={selectedArtifactPath}
                    onDisplayArtifact={onDisplayArtifact}
                  />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-surface-300 bg-white px-4 py-6 text-sm leading-6 text-surface-600">
                This branch is approved, but its continuation transcript is not available in the current view.
                {branchTarget && mode === 'parent' ? ' Open the fork to see the complete path.' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProjectForkBuildPath
