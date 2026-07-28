'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  ProjectForkLineageTruth,
} from '@/lib/project-forks'
import {
  buildProjectResponseForkHref,
  reconcileProjectForkFinalArtifactProvenance,
  resolveProjectForkPoint,
} from '@/lib/project-forks'
import { ForkTruthDisclosure } from '@/components/ForkTruthDisclosure'
import { publicArtifactStatusPresentation } from '@/lib/public-project-truth'
import {
  resolvePublicSourceEvidence,
  type PublicEvidenceTruth,
} from '@/lib/public-source-evidence'
import { providerPublicShareHref } from '@/lib/provider-public-share'
import ProjectForkGenerationWorkspace from '@/components/ProjectForkGenerationWorkspace'

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

type ProjectForkArtifactProvenance = ProjectForkArtifactVersion & Required<Pick<
  ProjectForkArtifactVersion,
  | 'sourceRunId'
  | 'sourceStepId'
  | 'sourceStepNumber'
  | 'sourceArtifactPath'
  | 'artifactSha256'
>>

function hasCompleteForkArtifactProvenance(
  artifact: ProjectForkArtifactVersion | undefined,
): artifact is ProjectForkArtifactProvenance {
  return Boolean(
    artifact?.sourceRunId?.trim() &&
    artifact.sourceStepId?.trim() &&
    Number.isInteger(artifact.sourceStepNumber) &&
    (artifact.sourceStepNumber ?? 0) > 0 &&
    artifact.sourceArtifactPath?.trim() &&
    artifact.artifactSha256?.trim(),
  )
}

export type ProjectForkBuildPathProps = {
  mode?: ProjectForkBuildPathMode
  lineage?: ProjectForkLineageTruth | null
  sourceSteps: ProjectForkSourceStep[]
  forkSource?: ProjectForkSource
  branch: ProjectForkNetworkItem
  trail?: ProjectForkBuildPathCrumb[]
  sourceProjectHref?: string | null
  branchHref?: string | null
  newForkHref?: string | null
  sourceRunHref?: string | null
  sourceEvidence?: PublicEvidenceTruth
  selectedArtifactPath?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  onClose?: () => void
  isArtifactDisplayable?: (artifactPath: string, artifactId: string) => boolean
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
    <article
      className={[
        'grid gap-2',
        isForkPoint ? 'relative lg:pl-[72px]' : '',
      ].join(' ')}
      data-fork-inherited-step={step.id}
    >
      <div
        className={[
          'relative border border-surface-200 border-l-2 bg-white px-3 py-2.5',
          isForkPoint ? 'border-l-[#2bd15f]' : 'border-l-brand-orange',
        ].join(' ')}
        data-fork-source-prompt={isForkPoint ? step.id : undefined}
        data-fork-source-prompt-step-number={isForkPoint ? step.stepNumber : undefined}
      >
        {isForkPoint && (
          <>
            <span
              className="absolute -left-[52px] bottom-0 top-0 hidden w-8 border-x-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_5px_0_0_rgba(255,255,255,0.24),inset_-5px_0_0_rgba(0,0,0,0.2)] lg:block"
              data-fork-source-pipeline="prompt"
              aria-hidden="true"
            />
            <span
              className="absolute -left-[72px] top-1/2 hidden h-14 w-12 -translate-y-1/2 border-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_6px_0_0_rgba(255,255,255,0.28),inset_-6px_0_0_rgba(0,0,0,0.18)] lg:block"
              data-fork-source-prompt-node={step.id}
              aria-hidden="true"
            />
            <span
              className="absolute -left-7 top-1/2 hidden h-7 w-7 -translate-y-1/2 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)] lg:block"
              aria-hidden="true"
            />
          </>
        )}
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
          'relative border px-3 py-2.5',
          isForkPoint
            ? 'border-brand-orange bg-primary-50 ring-2 ring-brand-orange/15'
            : 'border-surface-200 bg-surface-50',
        ].join(' ')}
        data-fork-source-response={isForkPoint ? 'true' : undefined}
        data-fork-source-response-id={isForkPoint ? step.id : undefined}
      >
        {isForkPoint && (
          <>
            <span
              className="absolute -left-[52px] top-[-10px] bottom-1/2 hidden w-8 border-x-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_5px_0_0_rgba(255,255,255,0.24),inset_-5px_0_0_rgba(0,0,0,0.2)] lg:block"
              data-fork-source-pipeline="response"
              aria-hidden="true"
            />
            <span
              className="absolute -left-[72px] top-1/2 hidden h-14 w-12 -translate-y-1/2 border-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_6px_0_0_rgba(255,255,255,0.28),inset_-6px_0_0_rgba(0,0,0,0.18)] lg:block"
              data-fork-source-response-node={step.id}
              aria-hidden="true"
            />
            <span
              className="absolute -left-7 top-1/2 hidden h-7 w-7 -translate-y-1/2 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)] lg:block"
              aria-hidden="true"
            />
            <span
              className="absolute left-full top-1/2 z-20 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center border-4 border-[#8f3f0a] bg-brand-orange shadow-[0_0_0_7px_rgba(232,122,44,0.16)] lg:grid"
              data-fork-response-socket
              data-fork-response-socket-step={step.id}
              aria-hidden="true"
            >
              <span className="h-4 w-4 border-2 border-[#8f3f0a] bg-primary-50" />
            </span>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-surface-500">
            {step.responseLabel ?? `Response ${stepLabel(step.stepNumber)}`}
          </span>
          {isForkPoint && (
            <span className="border border-brand-orange/40 bg-white px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-brand-orange-ink">
              Exact fork point
            </span>
          )}
        </div>
        {step.responseDisclosure && (
          <p
            className="mt-2 border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-950"
            data-fork-response-capture-disclosure
          >
            {step.responseDisclosure}
          </p>
        )}
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
          <div className="grid gap-3 border-t border-surface-200 bg-surface-50 p-3">
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
              <span className="hidden border border-surface-200 bg-surface-50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-surface-500 sm:inline" data-public-model-identity>
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
  mode,
  providerName,
  artifactOpenHrefs,
  selectedArtifactPath,
  isArtifactDisplayable,
  onDisplayArtifact,
}: {
  artifacts: ProjectForkBuildPathArtifact[]
  mode: ProjectForkBuildPathMode
  providerName?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  selectedArtifactPath?: string | null
  isArtifactDisplayable?: (artifactPath: string, artifactId: string) => boolean
  onDisplayArtifact?: (artifactPath: string, artifactTitle: string, artifactId: string) => void
}) {
  if (artifacts.length === 0) return null

  return (
    <div className="mt-4 grid gap-2" aria-label="Artifact versions">
      {artifacts.map((artifact) => {
        const isSelected = selectedArtifactPath === artifact.artifactPath
        const openHref = artifactOpenHrefs?.[artifact.artifactPath]
          ?? artifactViewerHref(artifact, providerName)
        const canDisplay = Boolean(
          onDisplayArtifact &&
          (isArtifactDisplayable?.(artifact.artifactPath, artifact.id) ?? true),
        )

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
              {canDisplay && onDisplayArtifact && (
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
                  {isSelected
                    ? 'Displayed here'
                    : mode === 'parent'
                      ? 'Preview here'
                      : 'Display artifact here'}
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
  isFirst,
  mode,
  providerName,
  artifactOpenHrefs,
  selectedArtifactPath,
  isArtifactDisplayable,
  onDisplayArtifact,
}: {
  step: ProjectForkContinuationStep
  isFirst: boolean
  mode: ProjectForkBuildPathMode
  providerName?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  selectedArtifactPath?: string | null
  isArtifactDisplayable?: (artifactPath: string, artifactId: string) => boolean
  onDisplayArtifact?: (artifactPath: string, artifactTitle: string, artifactId: string) => void
}) {
  const artifacts = continuationArtifacts(step)

  return (
    <article
      className="relative min-w-0 max-w-full lg:pl-[88px]"
      data-fork-continuation={step.id}
    >
      <div className="min-w-0 max-w-full border border-surface-200 bg-white shadow-[0_18px_44px_rgba(24,24,27,0.07)]">
        <div
          className="relative min-w-0 max-w-full p-4 sm:p-5"
          data-fork-continuation-prompt={step.id}
          data-fork-continuation-prompt-step-number={step.stepNumber}
        >
          <span
            className="absolute -left-[88px] top-1/2 hidden h-14 w-12 -translate-y-1/2 border-4 border-[#8f3f0a] bg-brand-orange shadow-[inset_6px_0_0_rgba(255,255,255,0.28),inset_-6px_0_0_rgba(0,0,0,0.18)] lg:block"
            data-fork-continuation-prompt-node={step.id}
            aria-hidden="true"
          />
          <span
            className="absolute -left-10 top-1/2 hidden h-7 w-10 -translate-y-1/2 border-y-4 border-[#8f3f0a] bg-brand-orange shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)] lg:block"
            data-fork-continuation-prompt-card-arm={step.id}
            aria-hidden="true"
          />
          {isFirst && (
            <span
              className="absolute -left-[104px] top-1/2 hidden h-7 w-4 -translate-y-1/2 border-y-4 border-[#8f3f0a] bg-brand-orange shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)] lg:block"
              data-fork-continuation-incoming-arm={step.id}
              aria-hidden="true"
            />
          )}
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange-ink">
            Prompt {stepLabel(step.stepNumber)} · Fork continuation
          </div>
          <div className="mt-2 grid min-w-0 gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
            <h4 className="min-w-0 break-words text-lg font-black text-surface-900">{step.promptTitle}</h4>
            {step.forkHref && (
              <Link
                href={step.forkHref}
                aria-label={`Fork this branch from response ${stepLabel(step.stepNumber)}`}
                data-fork-continuation-fork={step.id}
                className="inline-flex min-h-10 w-fit max-w-full items-center justify-center gap-2 border border-brand-orange bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-brand-orange-ink transition hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange sm:shrink-0"
              >
                <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
                Fork from this result
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className="mt-3">
            <ExactText label="Show exact prompt" text={step.promptText} />
          </div>
        </div>

        <div
          className="relative mb-4 sm:mb-5"
          data-fork-continuation-response={step.id}
          data-fork-continuation-response-step-number={step.stepNumber}
        >
          <span
            className="absolute -left-[88px] top-1/2 hidden h-14 w-12 -translate-y-1/2 border-4 border-[#8f3f0a] bg-brand-orange shadow-[inset_6px_0_0_rgba(255,255,255,0.28),inset_-6px_0_0_rgba(0,0,0,0.18)] lg:block"
            data-fork-continuation-response-node={step.id}
            aria-hidden="true"
          />
          <span
            className="absolute -left-10 top-1/2 hidden h-7 w-14 -translate-y-1/2 border-y-4 border-[#8f3f0a] bg-brand-orange shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)] sm:w-[60px] lg:block"
            data-fork-continuation-response-card-arm={step.id}
            aria-hidden="true"
          />
          <div className="mx-4 border-l-2 border-brand-orange bg-surface-50 p-3 sm:mx-5 sm:p-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-500">
              {step.responseLabel ?? `Response ${stepLabel(step.stepNumber)}`}
            </div>
            {step.responseDisclosure && (
              <p
                className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-normal leading-5 text-amber-950"
                data-fork-continuation-capture-disclosure
              >
                {step.responseDisclosure}
              </p>
            )}
            <p className="mt-2 break-words text-sm font-bold leading-6 text-surface-700 [overflow-wrap:anywhere]">
              {compactText(step.responseText, 'A captured response is preserved in this branch.', 180)}
            </p>
            <div className="mt-3">
              <ExactText
                label={step.responseLabel ? `Show ${step.responseLabel.toLowerCase()}` : 'Show exact response'}
                text={step.responseText}
              />
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <ArtifactActions
            artifacts={artifacts}
            mode={mode}
            providerName={providerName}
            artifactOpenHrefs={artifactOpenHrefs}
            selectedArtifactPath={selectedArtifactPath}
            isArtifactDisplayable={isArtifactDisplayable}
            onDisplayArtifact={onDisplayArtifact}
          />
        </div>
      </div>
    </article>
  )
}

function LegacyProjectForkBuildPath({
  mode = 'parent',
  sourceSteps,
  forkSource,
  branch,
  trail = [],
  sourceProjectHref,
  branchHref,
  newForkHref,
  sourceRunHref,
  sourceEvidence,
  selectedArtifactPath,
  artifactOpenHrefs,
  onClose,
  isArtifactDisplayable,
  onDisplayArtifact,
  className = '',
}: ProjectForkBuildPathProps) {
  const fork = forkSource ? { ...branch, forkSource } : branch
  const publicSourceEvidence = sourceEvidence ?? resolvePublicSourceEvidence(null)
  const publicShareHref = providerPublicShareHref(
    sourceRunHref,
    publicSourceEvidence.accessState,
  )
  const publicArtifactStatus = publicArtifactStatusPresentation({
    qualityStatus: fork.childArtifactQualityStatus ?? 'recorded',
    knownIssueExplanation: fork.childArtifactKnownIssueExplanation,
  })
  const forkPoint = resolveProjectForkPoint(sourceSteps, fork.forkSource)
  const forkPointIndex = forkPoint
    ? sourceSteps.findIndex((step) => step.id === forkPoint.id)
    : -1
  const visibleInheritedSteps = forkPointIndex >= 0
    ? sourceSteps.slice(0, forkPointIndex + 1)
    : sourceSteps
  const continuationSteps = useMemo(
    () => fork.continuationSteps ?? [],
    [fork.continuationSteps],
  )
  const firstContinuation = continuationSteps[0]
  const branchTarget = branchHref ?? fork.childRoute ?? null
  const forkNumber = fork.forkSource.sourceStepNumber
  const label = mode === 'child' ? 'Fork build path' : 'Selected branch'
  const desktopPathRef = useRef<HTMLDivElement | null>(null)
  const [forkConnector, setForkConnector] = useState<{
    sourceStepId: string
    continuationStepId: string
    sourceY: number
    continuationY: number
  } | null>(null)
  const [continuationSpine, setContinuationSpine] = useState<{
    sourceStepId: string
    firstStepId: string
    lastStepId: string
    top: number
    height: number
  } | null>(null)

  useEffect(() => {
    const clearMeasurements = () => {
      const frame = window.requestAnimationFrame(() => {
        setForkConnector(null)
        setContinuationSpine(null)
      })
      return () => window.cancelAnimationFrame(frame)
    }
    const desktopPath = desktopPathRef.current
    if (!desktopPath || !forkPoint || !firstContinuation) {
      return clearMeasurements()
    }

    const sourceResponse = desktopPath.querySelector<HTMLElement>(
      `[data-fork-source-response-id="${CSS.escape(forkPoint.id)}"]`,
    )
    const continuationPrompt = desktopPath.querySelector<HTMLElement>(
      `[data-fork-continuation-prompt="${CSS.escape(firstContinuation.id)}"]`,
    )
    const continuationWorkspace = desktopPath.querySelector<HTMLElement>(
      '[data-fork-continuation-workspace]',
    )
    const inheritedSteps = Array.from(
      desktopPath.querySelectorAll<HTMLElement>('[data-fork-inherited-step]'),
    )
    const continuationPairs = continuationSteps.flatMap((step) => {
      const prompt = desktopPath.querySelector<HTMLElement>(
        `[data-fork-continuation-prompt="${CSS.escape(step.id)}"]`,
      )
      const response = desktopPath.querySelector<HTMLElement>(
        `[data-fork-continuation-response="${CSS.escape(step.id)}"]`,
      )
      return prompt && response ? [{ prompt, response }] : []
    })
    if (
      !sourceResponse ||
      !continuationPrompt ||
      !continuationWorkspace ||
      continuationPairs.length !== continuationSteps.length
    ) {
      return clearMeasurements()
    }

    const alignResponseToPrompt = () => {
      const pathRect = desktopPath.getBoundingClientRect()
      const sourceRect = sourceResponse.getBoundingClientRect()
      const continuationRect = continuationPrompt.getBoundingClientRect()
      const next = {
        sourceStepId: forkPoint.id,
        continuationStepId: firstContinuation.id,
        sourceY: sourceRect.top - pathRect.top + sourceRect.height / 2,
        continuationY: continuationRect.top - pathRect.top + continuationRect.height / 2,
      }
      setForkConnector((previous) => (
        previous?.sourceStepId === next.sourceStepId &&
        previous.continuationStepId === next.continuationStepId &&
        Math.abs(previous.sourceY - next.sourceY) < 0.5 &&
        Math.abs(previous.continuationY - next.continuationY) < 0.5
          ? previous
          : next
      ))

      const workspaceRect = continuationWorkspace.getBoundingClientRect()
      const firstRect = continuationPairs[0].prompt.getBoundingClientRect()
      const lastRect = continuationPairs.at(-1)?.response.getBoundingClientRect()
      if (!lastRect) return
      const firstCenter = firstRect.top - workspaceRect.top + firstRect.height / 2
      const lastCenter = lastRect.top - workspaceRect.top + lastRect.height / 2
      const nextSpine = {
        sourceStepId: forkPoint.id,
        firstStepId: firstContinuation.id,
        lastStepId: continuationSteps.at(-1)?.id ?? firstContinuation.id,
        top: firstCenter,
        height: Math.max(0, lastCenter - firstCenter),
      }
      setContinuationSpine((previous) => (
        previous?.sourceStepId === nextSpine.sourceStepId &&
        previous.firstStepId === nextSpine.firstStepId &&
        previous.lastStepId === nextSpine.lastStepId &&
        Math.abs(previous.top - nextSpine.top) < 0.5 &&
        Math.abs(previous.height - nextSpine.height) < 0.5
          ? previous
          : nextSpine
      ))
    }

    alignResponseToPrompt()
    const observer = new ResizeObserver(alignResponseToPrompt)
    observer.observe(desktopPath)
    observer.observe(sourceResponse)
    observer.observe(continuationPrompt)
    observer.observe(continuationWorkspace)
    inheritedSteps.forEach((step) => observer.observe(step))
    continuationPairs.forEach(({ prompt, response }) => {
      observer.observe(prompt)
      observer.observe(response)
    })
    window.addEventListener('resize', alignResponseToPrompt)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', alignResponseToPrompt)
    }
  }, [continuationSteps, firstContinuation, fork.id, forkPoint])

  const currentContinuationSpine = (
    continuationSpine &&
    forkPoint &&
    firstContinuation &&
    continuationSpine.sourceStepId === forkPoint.id &&
    continuationSpine.firstStepId === firstContinuation.id &&
    continuationSpine.lastStepId === continuationSteps.at(-1)?.id
  ) ? continuationSpine : null

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
              <span className="border border-surface-200 bg-surface-50 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-surface-600" data-public-model-identity>
                {fork.modelUsed}
              </span>
            )}
            <span className="border border-brand-orange/30 bg-primary-50 px-2.5 py-1.5 text-[10px] font-bold text-brand-orange-ink">
              Forked from{' '}
              {sourceProjectHref ? (
                <Link href={sourceProjectHref} className="underline decoration-brand-orange/30 underline-offset-2">
                  {fork.forkSource.sourceProjectTitle || 'source project'}
                </Link>
              ) : (
                fork.forkSource.sourceProjectTitle || 'source project'
              )}
              {forkNumber !== undefined ? ` · response ${forkNumber}` : ''}
            </span>
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
              Open this fork
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </ActionLink>
          )}
          {publicShareHref && (
            <ActionLink
              href={publicShareHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-surface-700 transition hover:border-brand-orange hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
              {publicSourceEvidence.providerLinkLabel}
            </ActionLink>
          )}
          {newForkHref && mode === 'parent' && (
            <ActionLink
              href={newForkHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-brand-orange bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-brand-orange-ink transition hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
              Fork from parent response
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
        <div className="lg:col-span-2">
          <ForkTruthDisclosure
            artifact={publicArtifactStatus}
            sourceEvidence={publicSourceEvidence}
          />
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
          className="grid gap-4 lg:grid-cols-[minmax(250px,320px)_72px_minmax(0,1fr)] lg:items-stretch"
          data-fork-desktop-path
          data-fork-desktop-layout="branch"
        >
          <aside
            className="relative hidden border-2 border-surface-900 bg-white p-4 shadow-[0_16px_38px_rgba(24,24,27,0.07)] lg:block"
            data-fork-inherited-path
            data-fork-source-lane
          >
            <div className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange-ink">
              Inherited source path · Left lane
            </div>
            <InheritedPath steps={visibleInheritedSteps} forkPointId={forkPoint?.id} />
          </aside>

          <div
            className="relative hidden min-h-[220px] lg:block"
            data-fork-connector-lane
            aria-hidden="true"
          >
            {forkPoint && continuationSteps[0] && (
              <div
                className={[
                  'pointer-events-none absolute -left-4 -right-4 transition-[top,height,opacity] duration-150',
                  forkConnector?.sourceStepId === forkPoint.id &&
                  forkConnector.continuationStepId === continuationSteps[0].id
                    ? 'opacity-100'
                    : 'opacity-0',
                ].join(' ')}
                style={{
                  top: forkConnector
                    ? Math.min(forkConnector.sourceY, forkConnector.continuationY) - 24
                    : '50%',
                  height: forkConnector
                    ? Math.abs(forkConnector.continuationY - forkConnector.sourceY) + 48
                    : 48,
                }}
                data-fork-response-connector
                data-fork-response-connector-source-step={forkPoint.id}
                data-fork-response-connector-target-step={continuationSteps[0].id}
              >
                <div
                  className="absolute -left-2 right-1/2 h-4 -translate-y-1/2 border-y-2 border-[#8f3f0a] bg-brand-orange shadow-[inset_0_3px_0_rgba(255,255,255,0.3),inset_0_-3px_0_rgba(0,0,0,0.12)]"
                  style={{ top: forkConnector ? forkConnector.sourceY - Math.min(forkConnector.sourceY, forkConnector.continuationY) + 24 : 24 }}
                  data-fork-source-connector-endpoint
                />
                <div
                  className="absolute left-1/2 w-4 -translate-x-1/2 border-x-2 border-[#8f3f0a] bg-brand-orange shadow-[inset_3px_0_0_rgba(255,255,255,0.25),inset_-3px_0_0_rgba(0,0,0,0.12)]"
                  style={{
                    top: forkConnector ? Math.min(forkConnector.sourceY, forkConnector.continuationY) - Math.min(forkConnector.sourceY, forkConnector.continuationY) + 24 : 24,
                    height: forkConnector ? Math.max(4, Math.abs(forkConnector.continuationY - forkConnector.sourceY)) : 4,
                  }}
                  data-fork-response-connector-vertical
                />
                <div
                  className="absolute -right-8 left-1/2 h-4 -translate-y-1/2 border-y-2 border-[#8f3f0a] bg-brand-orange shadow-[inset_0_3px_0_rgba(255,255,255,0.3),inset_0_-3px_0_rgba(0,0,0,0.12)]"
                  style={{ top: forkConnector ? forkConnector.continuationY - Math.min(forkConnector.sourceY, forkConnector.continuationY) + 24 : 24 }}
                  data-fork-continuation-connector-endpoint
                />
                <div
                  className="absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 border-2 border-[#8f3f0a] bg-brand-orange"
                  style={{ top: forkConnector ? forkConnector.sourceY - Math.min(forkConnector.sourceY, forkConnector.continuationY) + 24 : 24 }}
                  data-fork-response-elbow
                />
                <div
                  className="absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 border-2 border-[#8f3f0a] bg-brand-orange"
                  style={{ top: forkConnector ? forkConnector.continuationY - Math.min(forkConnector.sourceY, forkConnector.continuationY) + 24 : 24 }}
                  data-fork-continuation-elbow
                />
              </div>
            )}
          </div>

          <div
            className="min-w-0 border-2 border-surface-900 bg-surface-50 p-3 shadow-[0_16px_38px_rgba(24,24,27,0.07)] sm:p-4"
            data-fork-continuation-lane
          >
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
              <div className="relative grid min-w-0 max-w-full gap-4" data-fork-continuation-workspace>
                {currentContinuationSpine && (
                  <span
                    className="absolute left-[22px] hidden w-8 border-x-4 border-[#8f3f0a] bg-brand-orange shadow-[inset_5px_0_0_rgba(255,255,255,0.24),inset_-5px_0_0_rgba(0,0,0,0.2)] lg:block"
                    style={{ top: currentContinuationSpine.top, height: currentContinuationSpine.height }}
                    data-fork-continuation-pipeline={`${currentContinuationSpine.firstStepId}:${currentContinuationSpine.lastStepId}`}
                    data-fork-continuation-pipeline-first-step={currentContinuationSpine.firstStepId}
                    data-fork-continuation-pipeline-last-step={currentContinuationSpine.lastStepId}
                    aria-hidden="true"
                  />
                )}
                {continuationSteps.map((step, index) => (
                  <ContinuationStepCard
                    key={step.id}
                    step={step}
                    isFirst={index === 0}
                    mode={mode}
                    providerName={fork.childProviderName}
                    artifactOpenHrefs={artifactOpenHrefs}
                    selectedArtifactPath={selectedArtifactPath}
                    isArtifactDisplayable={isArtifactDisplayable}
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

export function ProjectForkBuildPath(props: ProjectForkBuildPathProps) {
  if (props.lineage) {
    const currentGenerations = props.lineage.generations.filter(
      (generation) => generation.isCurrent,
    )
    const currentGeneration = currentGenerations.length === 1
      ? currentGenerations[0]
      : null
    const displayedSteps = props.branch.continuationSteps?.length
      ? props.branch.continuationSteps
      : currentGeneration?.presentation.localSteps ?? []
    const authoritativeFinalStep = currentGeneration?.presentation.localSteps.at(-1)
    const reconciledFinalArtifact = reconcileProjectForkFinalArtifactProvenance(
      displayedSteps,
      (
        props.lineage.integrity.kind === 'complete' &&
        currentGeneration?.projectId === props.branch.id
      )
        ? authoritativeFinalStep
        : null,
    )
    const currentSteps = reconciledFinalArtifact.steps
    const finalStep = currentSteps.at(-1)
    const hasCompleteArtifactProvenance = hasCompleteForkArtifactProvenance(
      reconciledFinalArtifact.matchedArtifact ?? undefined,
    )
    const authoritativeForkHref = (
      props.lineage.eligibility.allowed &&
      finalStep
    )
      ? (
          hasCompleteArtifactProvenance &&
          reconciledFinalArtifact.matchedArtifact
        )
        ? buildProjectResponseForkHref({
            sourceProjectId: currentGeneration?.projectId ?? props.branch.id,
            sourceProjectTitle: currentGeneration?.title ?? props.branch.title,
            sourceModelVariantId: reconciledFinalArtifact.matchedArtifact.sourceModelVariantId,
            sourceRunId: reconciledFinalArtifact.matchedArtifact.sourceRunId,
            sourceStepId: reconciledFinalArtifact.matchedArtifact.sourceStepId,
            sourceStepNumber: reconciledFinalArtifact.matchedArtifact.sourceStepNumber,
            sourceArtifactPath: reconciledFinalArtifact.matchedArtifact.sourceArtifactPath,
            sourceArtifactSha256: reconciledFinalArtifact.matchedArtifact.artifactSha256,
            currentForkSource: currentGeneration?.forkSource ?? props.branch.forkSource,
            promptFamilyId: currentGeneration?.forkSource?.promptFamilyId
              ?? props.branch.forkSource.promptFamilyId,
            destination: '/build',
          })
        : null
      : null
    const continuationSteps = currentSteps.map((step) => ({
      ...step,
      forkHref: step.id === finalStep?.id ? authoritativeForkHref : null,
    }))
    const forkBase = props.forkSource
      ? { ...props.branch, forkSource: props.forkSource }
      : props.branch
    const fork = {
      ...forkBase,
      continuationSteps,
    }

    return (
      <ProjectForkGenerationWorkspace
        lineage={props.lineage}
        mode={props.mode ?? 'parent'}
        branch={fork}
        sourceProjectHref={props.sourceProjectHref}
        branchHref={props.branchHref}
        sourceRunHref={props.sourceRunHref}
        sourceEvidence={props.sourceEvidence}
        selectedArtifactPath={props.selectedArtifactPath}
        artifactOpenHrefs={props.artifactOpenHrefs}
        onClose={props.onClose}
        isArtifactDisplayable={props.isArtifactDisplayable}
        onDisplayArtifact={props.onDisplayArtifact}
        className={props.className}
      />
    )
  }

  return <LegacyProjectForkBuildPath {...props} />
}

export default ProjectForkBuildPath
