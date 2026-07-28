'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  FileCode2,
  GitBranch,
  GitFork,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { ForkTruthDisclosure } from '@/components/ForkTruthDisclosure'
import type {
  ProjectForkArtifactVersion,
  ProjectForkContinuationStep,
  ProjectForkEligibility,
  ProjectForkEligibilityReason,
  ProjectForkLineageEdge,
  ProjectForkLineageGeneration,
  ProjectForkLineageIntegrityKind,
  ProjectForkLineageTruth,
  ProjectForkNetworkItem,
} from '@/lib/project-forks'
import { publicArtifactStatusPresentation } from '@/lib/public-project-truth'
import {
  resolvePublicSourceEvidence,
  type PublicEvidenceTruth,
} from '@/lib/public-source-evidence'
import { providerPublicShareHref } from '@/lib/provider-public-share'

type ProjectForkGenerationPresentation =
  Omit<ProjectForkLineageGeneration, 'presentation'> & {
    href: string | null
    modelLabel?: string | null
    providerName?: string | null
    description?: string | null
    localSteps: ProjectForkContinuationStep[]
  }

type ProjectForkWorkspaceModel = {
  generations: ProjectForkGenerationPresentation[]
  integrity: ProjectForkLineageTruth['integrity']
  eligibility: ProjectForkEligibility
  maxLevels: number
  maxWidth: number
}

type ArtifactPresentation = ProjectForkArtifactVersion & {
  stepId: string
  stepNumber: number
}

type ConnectorMeasurement = {
  fromLevel: number
  toLevel: number
  parentGenerationId: string
  childGenerationId: string
  parentResponseId: string
  parentResponsePackageId: string
  parentLocalStepId: string
  parentResponseAnchorId: string
  childPromptId: string
  storedDepth: number
  branchIndex: number
  promptFamilyId?: string
  sourceRunId?: string
  sourceArtifactPath?: string
  sourceArtifactSha256?: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

export type ProjectForkGenerationWorkspaceProps = {
  lineage: ProjectForkLineageTruth
  mode: 'parent' | 'child'
  branch: ProjectForkNetworkItem
  sourceProjectHref?: string | null
  branchHref?: string | null
  sourceRunHref?: string | null
  sourceEvidence?: PublicEvidenceTruth
  selectedArtifactPath?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  onClose?: () => void
  isArtifactDisplayable?: (artifactPath: string, artifactId: string) => boolean
  onDisplayArtifact?: (artifactPath: string, artifactTitle: string, artifactId: string) => void
  className?: string
}

function projectDescription(project: unknown) {
  if (
    project &&
    typeof project === 'object' &&
    'description' in project &&
    (typeof project.description === 'string' || project.description === null)
  ) {
    return project.description
  }
  return null
}

export function adaptProjectForkLineagePresentation(
  lineage: ProjectForkLineageTruth,
  branch: ProjectForkNetworkItem,
): ProjectForkWorkspaceModel {
  return {
    generations: lineage.generations.map((generation) => ({
      ...generation,
      href: generation.presentation.href,
      modelLabel: generation.presentation.modelLabel,
      providerName: generation.presentation.providerName,
      description: projectDescription(generation.project),
      localSteps: (
        generation.isCurrent &&
        generation.projectId === branch.id &&
        branch.continuationSteps?.length
      )
        ? branch.continuationSteps
        : generation.presentation.localSteps,
    })),
    integrity: lineage.integrity,
    eligibility: lineage.eligibility,
    maxLevels: lineage.maxLevels,
    maxWidth: lineage.maxWidth,
  }
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
  children: ReactNode
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

function artifactViewerHref(artifact: ArtifactPresentation, providerName?: string | null) {
  const query = new URLSearchParams({
    path: artifact.artifactPath,
    title: artifact.artifactTitle,
  })
  if (providerName?.trim()) query.set('provider', providerName.trim())
  return `/artifact-viewer?${query.toString()}`
}

function stepArtifacts(step: ProjectForkContinuationStep): ArtifactPresentation[] {
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

function ExactText({
  label,
  text,
}: {
  label: string
  text?: string | null
}) {
  const normalized = text?.trim()
  if (!normalized) return null

  return (
    <details className="group/exact overflow-hidden border border-surface-200 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-bold text-surface-700 marker:content-none hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange">
        <span>{label}</span>
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none group-open/exact:rotate-90"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-surface-200 px-3 py-3 text-sm leading-6 whitespace-pre-wrap break-words text-surface-700">
        {normalized}
      </div>
    </details>
  )
}

function ArtifactActions({
  artifacts,
  displayLevel,
  generationIndex,
  providerName,
  selectedArtifactPath,
  artifactOpenHrefs,
  isArtifactDisplayable,
  onDisplayArtifact,
}: {
  artifacts: ArtifactPresentation[]
  displayLevel: number
  generationIndex: number
  providerName?: string | null
  selectedArtifactPath?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  isArtifactDisplayable?: (artifactPath: string, artifactId: string) => boolean
  onDisplayArtifact?: (artifactPath: string, artifactTitle: string, artifactId: string) => void
}) {
  if (artifacts.length === 0) return null

  return (
    <div className="grid gap-2 border-t border-surface-200 p-3" aria-label={`Level ${displayLevel} artifact versions`}>
      {artifacts.map((artifact) => {
        const isSelected = artifact.artifactPath === selectedArtifactPath
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
              'grid gap-2 border p-3',
              isSelected
                ? 'border-brand-blue bg-brand-blue/5'
                : 'border-surface-200 bg-surface-50',
            ].join(' ')}
            data-fork-generation-artifact
            data-display-level={displayLevel}
            data-generation-index={generationIndex}
            data-artifact-id={artifact.id}
            data-artifact-path={artifact.artifactPath}
            data-source-artifact-path={artifact.sourceArtifactPath}
            data-artifact-sha256={artifact.artifactSha256}
            data-provider-name={providerName ?? undefined}
          >
            <div className="min-w-0">
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-surface-500">
                Artifact {artifact.isDefault ? '· Default' : ''}
              </div>
              <div className="mt-1 break-words text-sm font-black text-surface-900">
                {artifact.artifactTitle}
              </div>
              {artifact.artifactSha256 && (
                <div className="mt-1 truncate font-mono text-[9px] text-surface-500">
                  SHA-256 {artifact.artifactSha256}
                </div>
              )}
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
                  data-artifact-id={artifact.id}
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? 'Displayed' : 'Display'} ${artifact.artifactTitle} from level ${displayLevel}`}
                  className={[
                    'inline-flex min-h-11 items-center justify-center border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue',
                    isSelected
                      ? 'border-brand-blue bg-brand-blue text-white'
                      : 'border-surface-300 bg-white text-surface-700 hover:border-brand-orange hover:text-brand-orange-ink',
                  ].join(' ')}
                >
                  {isSelected ? 'Displayed here' : 'Display here'}
                </button>
              )}
              <ActionLink
                href={openHref}
                ariaLabel={`Open ${artifact.artifactTitle} from level ${displayLevel}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-surface-700 transition motion-reduce:transition-none hover:border-brand-orange hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
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

function GenerationStep({
  step,
  generation,
  outgoingEdge,
  isIncomingTarget,
  isOutgoingSource,
  providerName,
  allowForkAction,
  selectedArtifactPath,
  artifactOpenHrefs,
  isArtifactDisplayable,
  onDisplayArtifact,
}: {
  step: ProjectForkContinuationStep
  generation: ProjectForkGenerationPresentation
  outgoingEdge: ProjectForkLineageEdge | null
  isIncomingTarget: boolean
  isOutgoingSource: boolean
  providerName?: string | null
  allowForkAction: boolean
  selectedArtifactPath?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  isArtifactDisplayable?: (artifactPath: string, artifactId: string) => boolean
  onDisplayArtifact?: (artifactPath: string, artifactTitle: string, artifactId: string) => void
}) {
  const tone = !generation.forkSource
    ? {
        rail: 'bg-[#2bd15f] border-[#07551f]',
        border: 'border-[#2bd15f]',
        text: 'text-[#07551f]',
      }
    : {
        rail: 'bg-brand-orange border-[#8f3f0a]',
        border: 'border-brand-orange',
        text: 'text-brand-orange-ink',
      }
  const artifacts = stepArtifacts(step)
  const responseSha = isOutgoingSource ? outgoingEdge?.sourceResponse.artifactSha256 : undefined

  return (
    <article
      className="relative grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 pl-10"
      data-fork-generation-step={step.id}
      data-display-level={generation.displayLevel}
      data-generation-index={generation.generationIndex}
    >
      <span
        className={`absolute left-3 top-0 h-full w-3 border-x-2 ${tone.rail}`}
        aria-hidden="true"
      />
      <div
        className={[
          'relative border bg-white p-3',
          isIncomingTarget ? `${tone.border} ring-2 ring-brand-orange/15` : 'border-surface-200',
        ].join(' ')}
        data-fork-generation-prompt={step.id}
        data-generation-id={generation.projectId}
        data-step-id={step.id}
        data-testid={isIncomingTarget ? `fork-prompt-${generation.displayLevel}` : undefined}
      >
        <span
          className={`absolute -left-[31px] top-1/2 h-5 w-7 -translate-y-1/2 border-y-2 ${tone.rail}`}
          aria-hidden="true"
        />
        <div className={`font-mono text-[9px] font-black uppercase tracking-[0.14em] ${tone.text}`}>
          Prompt {stepLabel(step.stepNumber)}
          {isIncomingTarget ? ' · Continuation entry' : ''}
        </div>
        <h4 className="mt-1 break-words text-sm font-black leading-5 text-surface-900">
          {step.promptTitle}
        </h4>
        <div className="mt-2">
          <ExactText label="Show exact prompt" text={step.promptText} />
        </div>
      </div>

      <div
        className={[
          'relative border bg-surface-50 p-3',
          isOutgoingSource ? `${tone.border} ring-2 ring-brand-orange/15` : 'border-surface-200',
        ].join(' ')}
        data-fork-generation-response={step.id}
        data-generation-id={generation.projectId}
        data-step-id={step.id}
        data-response-package-id={step.responsePackageId}
        data-artifact-path={isOutgoingSource ? outgoingEdge?.sourceResponse.artifactPath : undefined}
        data-artifact-sha256={responseSha}
        data-testid={isOutgoingSource ? `fork-response-${generation.displayLevel}` : undefined}
      >
        <span
          className={`absolute -left-[31px] top-1/2 h-5 w-7 -translate-y-1/2 border-y-2 ${tone.rail}`}
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-surface-500">
            {step.responseLabel ?? `Response ${stepLabel(step.stepNumber)}`}
          </div>
          {isOutgoingSource && (
            <span className={`border bg-white px-2 py-1 font-mono text-[9px] font-black uppercase ${tone.border} ${tone.text}`}>
              Exact fork source
            </span>
          )}
        </div>
        {step.responseDisclosure && (
          <p className="mt-2 border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-950">
            {step.responseDisclosure}
          </p>
        )}
        <p className="mt-2 break-words text-xs font-bold leading-5 text-surface-700 [overflow-wrap:anywhere]">
          {compactText(step.responseText, 'Captured response', 160)}
        </p>
        <div className="mt-2">
          <ExactText label="Show exact response" text={step.responseText} />
        </div>
        {allowForkAction && step.forkHref && (
          <Link
            href={step.forkHref}
            data-fork-continuation-fork={step.id}
            aria-label={`Fork from response ${stepLabel(step.stepNumber)} in level ${generation.displayLevel}, ${generation.title}`}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 border border-brand-orange bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-brand-orange-ink transition motion-reduce:transition-none hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
            Fork from this result
          </Link>
        )}
      </div>

      <ArtifactActions
        artifacts={artifacts}
        displayLevel={generation.displayLevel}
        generationIndex={generation.generationIndex}
        providerName={providerName}
        selectedArtifactPath={selectedArtifactPath}
        artifactOpenHrefs={artifactOpenHrefs}
        isArtifactDisplayable={isArtifactDisplayable}
        onDisplayArtifact={onDisplayArtifact}
      />
    </article>
  )
}

function GenerationLane({
  generation,
  outgoingEdge,
  maxDepth,
  eligibility,
  snapAlignment,
  selectedArtifactPath,
  artifactOpenHrefs,
  isArtifactDisplayable,
  onDisplayArtifact,
}: {
  generation: ProjectForkGenerationPresentation
  outgoingEdge: ProjectForkLineageEdge | null
  maxDepth: number
  eligibility: ProjectForkWorkspaceModel['eligibility']
  snapAlignment: 'start' | 'center' | 'end'
  selectedArtifactPath?: string | null
  artifactOpenHrefs?: Record<string, string | undefined>
  isArtifactDisplayable?: (artifactPath: string, artifactId: string) => boolean
  onDisplayArtifact?: (artifactPath: string, artifactTitle: string, artifactId: string) => void
}) {
  const incomingTargetId = generation.incomingEdge?.targetPrompt.stepId
  const outgoingSourceAnchorId = outgoingEdge?.sourceResponse.localStepId
  const generationKind = generation.forkSource ? 'fork' : 'root'
  const allowForkAction = generation.isCurrent && eligibility.allowed

  return (
    <article
      id={`fork-generation-${generation.displayLevel}`}
      tabIndex={-1}
      className={[
        'relative w-[min(82vw,400px)] shrink-0 border-2 bg-white shadow-[0_18px_44px_rgba(24,24,27,0.09)] sm:w-[400px]',
        snapAlignment === 'start'
          ? 'snap-start scroll-mr-4'
          : snapAlignment === 'end'
            ? 'snap-end scroll-ml-4'
            : 'snap-center scroll-mx-4',
        generation.isCurrent
          ? 'border-brand-blue ring-4 ring-brand-blue/10'
          : generationKind === 'root'
            ? 'border-[#07551f]'
            : 'border-[#8f3f0a]',
      ].join(' ')}
      data-testid={`fork-node-${generation.displayLevel}`}
      data-fork-generation
      data-display-level={generation.displayLevel}
      data-generation-index={generation.generationIndex}
      data-generation-id={generation.projectId}
      data-generation-kind={generationKind}
      data-generation-current={generation.isCurrent ? 'true' : 'false'}
      aria-label={`Level ${generation.displayLevel} of ${maxDepth}: ${generation.title}${generation.isCurrent ? ', current generation' : ''}`}
    >
      <header
        className={[
          'border-b-2 p-4',
          generationKind === 'root'
            ? 'border-[#07551f] bg-[#eafbed]'
            : 'border-[#8f3f0a] bg-primary-50',
        ].join(' ')}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-surface-600">
              Level {generation.displayLevel} of {maxDepth}
              {' · '}
              {generationKind === 'root' ? 'Original source' : 'Fork generation'}
            </div>
            <h3 className="mt-1 break-words text-xl font-black text-surface-900">
              {generation.title}
            </h3>
          </div>
          {generation.isCurrent && (
            <span className="border border-brand-blue bg-white px-2.5 py-1.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-brand-blue">
              Current
            </span>
          )}
        </div>
        {generation.modelLabel && (
          <div
            className="mt-2 w-fit border border-surface-300 bg-white px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-surface-600"
            data-public-model-identity
          >
            {generation.modelLabel}
          </div>
        )}
        {!generation.isCurrent && generation.href && (
          <Link
            href={generation.href}
            aria-label={`Open level ${generation.displayLevel}, ${generation.title}`}
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-surface-700 underline decoration-brand-orange/40 underline-offset-4 hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            Open this generation
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </header>

      <div className="grid gap-4 p-3 sm:p-4">
        {generation.localSteps.length > 0 ? (
          generation.localSteps.map((step) => (
            <GenerationStep
              key={step.id}
              step={step}
              generation={generation}
              outgoingEdge={outgoingEdge}
              isIncomingTarget={step.id === incomingTargetId}
              isOutgoingSource={step.id === outgoingSourceAnchorId}
              providerName={generation.providerName}
              allowForkAction={allowForkAction}
              selectedArtifactPath={selectedArtifactPath}
              artifactOpenHrefs={artifactOpenHrefs}
              isArtifactDisplayable={isArtifactDisplayable}
              onDisplayArtifact={onDisplayArtifact}
            />
          ))
        ) : (
          <div className="border border-dashed border-surface-300 bg-surface-50 p-4 text-sm leading-6 text-surface-600">
            This generation is known, but its public prompt and response package is unavailable.
          </div>
        )}
      </div>
    </article>
  )
}

function integrityMessage(kind: ProjectForkLineageIntegrityKind) {
  switch (kind) {
    case 'complete':
      return null
    case 'missing-parent':
      return 'An earlier parent is missing. The known lineage prefix is shown and new forks are disabled.'
    case 'cycle':
      return 'A lineage cycle was detected. The known lineage prefix is shown and new forks are disabled.'
    case 'truncated':
      return 'This lineage extends beyond the supported ten display levels. The verified prefix is shown and new forks are disabled.'
    case 'unavailable':
      return 'Authoritative lineage data is temporarily unavailable. No fallback ancestry or fork action is shown.'
    case 'invalid':
      return 'This lineage failed an authority or provenance check. The verified prefix is shown and new forks are disabled.'
  }
}

function eligibilityMessage(reason: ProjectForkEligibilityReason) {
  switch (reason) {
    case 'eligible':
      return 'This current generation can create one more fork.'
    case 'max-depth':
      return 'Level 10 is terminal. No additional fork can be created.'
    case 'missing-parent':
      return 'Forking is disabled because an earlier parent is missing.'
    case 'cycle':
      return 'Forking is disabled because the lineage contains a cycle.'
    case 'truncated':
      return 'Forking is disabled because the lineage exceeds the supported display depth.'
    case 'unavailable':
      return 'Forking is disabled while authoritative lineage data is unavailable.'
    case 'invalid':
      return 'Forking is disabled because lineage or provenance validation failed.'
  }
}

export default function ProjectForkGenerationWorkspace({
  lineage: lineageTruth,
  mode,
  branch,
  sourceProjectHref,
  branchHref,
  sourceRunHref,
  sourceEvidence,
  selectedArtifactPath,
  artifactOpenHrefs,
  onClose,
  isArtifactDisplayable,
  onDisplayArtifact,
  className = '',
}: ProjectForkGenerationWorkspaceProps) {
  const lineage = useMemo(
    () => adaptProjectForkLineagePresentation(lineageTruth, branch),
    [branch, lineageTruth],
  )
  const generations = lineage.generations
  const currentGeneration = generations.find((generation) => generation.isCurrent)
    ?? generations.at(-1)
  const currentGenerationDisplayLevel = currentGeneration?.displayLevel
  const currentGenerationProjectId = currentGeneration?.projectId
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [activeLevel, setActiveLevel] = useState(currentGeneration?.displayLevel ?? 1)
  const [connectors, setConnectors] = useState<ConnectorMeasurement[]>([])
  const publicSourceEvidence = sourceEvidence ?? resolvePublicSourceEvidence(null)
  const publicShareHref = providerPublicShareHref(
    sourceRunHref,
    publicSourceEvidence.accessState,
  )
  const publicArtifactStatus = publicArtifactStatusPresentation({
    qualityStatus: branch.childArtifactQualityStatus ?? 'recorded',
    knownIssueExplanation: branch.childArtifactKnownIssueExplanation,
  })
  const integrityNotice = integrityMessage(lineage.integrity.kind)
  const branchTarget = branchHref ?? branch.childRoute ?? currentGeneration?.href ?? null
  const firstGeneration = generations[0]
  const firstGenerationIsVerifiedRoot = Boolean(
    firstGeneration?.displayLevel === 1 &&
    !firstGeneration.forkSource,
  )
  const renderedEdgeCount = generations.reduce(
    (count, generation) => count + (generation.incomingEdge ? 1 : 0),
    0,
  )
  const lineageStartHref = firstGeneration?.href ?? sourceProjectHref ?? null
  const lineageStartLabel = firstGenerationIsVerifiedRoot
    ? 'Original source'
    : 'Earliest verified level'

  const scrollToLevel = useCallback((
    displayLevel: number,
    behaviorOverride?: ScrollBehavior,
  ) => {
    const viewport = viewportRef.current
    const canvas = canvasRef.current
    const lane = canvas?.querySelector<HTMLElement>(
      `[data-fork-generation][data-display-level="${displayLevel}"]`,
    )
    if (!viewport || !canvas || !lane) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lanes = Array.from(
      canvas.querySelectorAll<HTMLElement>('[data-fork-generation]'),
    )
    const maximumScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    const targetLeft = lane === lanes[0]
      ? 0
      : lane === lanes.at(-1)
        ? maximumScrollLeft
        : lane.offsetLeft - Math.max(0, (viewport.clientWidth - lane.offsetWidth) / 2)
    viewport.scrollTo({
      left: targetLeft,
      behavior: reducedMotion ? 'auto' : (behaviorOverride ?? 'smooth'),
    })
    setActiveLevel(displayLevel)
  }, [])

  const handleWorkspaceKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (generations.length === 0) return
    const activeIndex = Math.max(
      0,
      generations.findIndex((generation) => generation.displayLevel === activeLevel),
    )
    let targetIndex: number | null = null
    if (event.key === 'ArrowRight') targetIndex = Math.min(generations.length - 1, activeIndex + 1)
    if (event.key === 'ArrowLeft') targetIndex = Math.max(0, activeIndex - 1)
    if (event.key === 'Home') targetIndex = 0
    if (event.key === 'End') targetIndex = generations.length - 1
    if (targetIndex === null) return

    event.preventDefault()
    scrollToLevel(generations[targetIndex].displayLevel)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animationFrame = 0
    const measure = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(() => {
        const canvasRect = canvas.getBoundingClientRect()
        const next = generations.flatMap<ConnectorMeasurement>((child, index) => {
          if (index === 0 || !child.incomingEdge) return []
          const parent = generations[index - 1]
          const source = canvas.querySelector<HTMLElement>(
            `[data-fork-generation][data-generation-id="${CSS.escape(parent.projectId)}"] [data-fork-generation-response="${CSS.escape(child.incomingEdge.sourceResponse.localStepId)}"]`,
          )
          const target = canvas.querySelector<HTMLElement>(
            `[data-fork-generation][data-generation-id="${CSS.escape(child.projectId)}"] [data-fork-generation-prompt="${CSS.escape(child.incomingEdge.targetPrompt.stepId)}"]`,
          )
          if (!source || !target) return []

          const sourceRect = source.getBoundingClientRect()
          const targetRect = target.getBoundingClientRect()
          return [{
            fromLevel: parent.displayLevel,
            toLevel: child.displayLevel,
            parentGenerationId: parent.projectId,
            childGenerationId: child.projectId,
            parentResponseId: child.incomingEdge.sourceResponse.stepId,
            parentResponsePackageId: child.incomingEdge.sourceResponse.responsePackageId,
            parentLocalStepId: child.incomingEdge.sourceResponse.localStepId,
            parentResponseAnchorId: child.incomingEdge.sourceResponse.localResponsePackageId,
            childPromptId: child.incomingEdge.targetPrompt.stepId,
            storedDepth: child.incomingEdge.storedDepth,
            branchIndex: child.incomingEdge.branchIndex,
            promptFamilyId: child.incomingEdge.promptFamilyId,
            sourceRunId: child.incomingEdge.sourceResponse.runId,
            sourceArtifactPath: child.incomingEdge.sourceResponse.artifactPath,
            sourceArtifactSha256: child.incomingEdge.sourceResponse.artifactSha256,
            sourceX: sourceRect.right - canvasRect.left,
            sourceY: sourceRect.top - canvasRect.top + sourceRect.height / 2,
            targetX: targetRect.left - canvasRect.left,
            targetY: targetRect.top - canvasRect.top + targetRect.height / 2,
          }]
        })
        setConnectors(next)
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    canvas.querySelectorAll<HTMLElement>('[data-fork-generation], details, [data-fork-generation-prompt], [data-fork-generation-response]')
      .forEach((element) => observer.observe(element))
    window.addEventListener('resize', measure)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [generations])

  useEffect(() => {
    const viewport = viewportRef.current
    const canvas = canvasRef.current
    if (!viewport || !canvas) return

    const syncBoundaryLevel = () => {
      const lanes = canvas.querySelectorAll<HTMLElement>('[data-fork-generation]')
      const firstLane = lanes[0]
      const lastLane = lanes[lanes.length - 1]
      const viewportRect = viewport.getBoundingClientRect()
      const viewportStyle = window.getComputedStyle(viewport)
      const paddingLeft = Number.parseFloat(viewportStyle.paddingLeft) || 0
      const paddingRight = Number.parseFloat(viewportStyle.paddingRight) || 0
      const scrollportLeft = viewportRect.left + viewport.clientLeft
      const scrollportRight = scrollportLeft + viewport.clientWidth
      const firstBoundaryDelta = firstLane
        ? Math.abs(firstLane.getBoundingClientRect().left - (scrollportLeft + paddingLeft))
        : Number.POSITIVE_INFINITY
      const lastBoundaryDelta = lastLane
        ? Math.abs(lastLane.getBoundingClientRect().right - (scrollportRight - paddingRight))
        : Number.POSITIVE_INFINITY
      if (firstBoundaryDelta <= 8) {
        setActiveLevel(generations[0]?.displayLevel ?? 1)
        return true
      }
      if (lastBoundaryDelta <= 8) {
        setActiveLevel(generations.at(-1)?.displayLevel ?? 1)
        return true
      }
      return false
    }
    const syncCenteredLevel = () => {
      if (syncBoundaryLevel()) return

      const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2
      let centeredLevel: number | null = null
      let smallestDistance = Number.POSITIVE_INFINITY
      for (const lane of canvas.querySelectorAll<HTMLElement>('[data-fork-generation]')) {
        const displayLevel = Number.parseInt(lane.dataset.displayLevel ?? '', 10)
        if (!Number.isFinite(displayLevel)) continue
        const laneCenter = lane.offsetLeft + lane.offsetWidth / 2
        const distance = Math.abs(laneCenter - viewportCenter)
        if (distance < smallestDistance) {
          centeredLevel = displayLevel
          smallestDistance = distance
        }
      }
      if (centeredLevel !== null) setActiveLevel(centeredLevel)
    }
    let animationFrame = 0
    const scheduleCenteredLevelSync = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(syncCenteredLevel)
    }
    const observer = new IntersectionObserver(scheduleCenteredLevelSync, {
      root: viewport,
      threshold: [0.25, 0.5, 0.75],
    })

    canvas.querySelectorAll<HTMLElement>('[data-fork-generation]')
      .forEach((lane) => observer.observe(lane))
    viewport.addEventListener('scroll', scheduleCenteredLevelSync, { passive: true })
    scheduleCenteredLevelSync()

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      viewport.removeEventListener('scroll', scheduleCenteredLevelSync)
    }
  }, [generations])

  useEffect(() => {
    if (currentGenerationDisplayLevel !== undefined) {
      const frame = window.requestAnimationFrame(() => (
        scrollToLevel(currentGenerationDisplayLevel, 'auto')
      ))
      return () => window.cancelAnimationFrame(frame)
    }
  }, [
    currentGenerationDisplayLevel,
    currentGenerationProjectId,
    scrollToLevel,
  ])

  const activeGenerationIndex = Math.max(
    0,
    generations.findIndex((generation) => generation.displayLevel === activeLevel),
  )
  const isAtFirstLevel = generations.length === 0 || activeGenerationIndex === 0
  const isAtLastLevel = (
    generations.length === 0 ||
    activeGenerationIndex === generations.length - 1
  )

  return (
    <section
      className={[
        'max-w-full overflow-hidden border border-surface-200 bg-white shadow-[0_18px_44px_rgba(24,24,27,0.07)]',
        className,
      ].join(' ')}
      data-project-fork-build-path
      data-project-fork-build-path-mode={mode}
      data-testid="fork-lineage"
    >
      <header className="grid gap-4 border-b border-surface-200 bg-white p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            Fork lineage · {generations.length} level{generations.length === 1 ? '' : 's'}
          </div>
          <h2 className="mt-2 text-2xl font-black text-surface-900">
            {currentGeneration?.title ?? branch.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">
            Each lane is one project generation. Follow the orange connectors from the exact parent response into the exact child continuation prompt.
            Swipe, scroll, or use the left and right arrow keys to inspect earlier levels.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
          {lineageStartHref && (
            <ActionLink
              href={lineageStartHref}
              ariaLabel={`Open ${lineageStartLabel.toLowerCase()}`}
              className="inline-flex min-h-11 items-center justify-center border border-surface-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-surface-700 transition motion-reduce:transition-none hover:border-brand-orange hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              {lineageStartLabel}
            </ActionLink>
          )}
          {branchTarget && mode === 'parent' && (
            <ActionLink
              href={branchTarget}
              ariaLabel={`Open current generation, ${currentGeneration?.title ?? branch.title}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-surface-900 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-white transition motion-reduce:transition-none hover:bg-surface-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              Open current
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </ActionLink>
          )}
          {publicShareHref && (
            <ActionLink
              href={publicShareHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-surface-700 transition motion-reduce:transition-none hover:border-brand-orange hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
              {publicSourceEvidence.providerLinkLabel}
            </ActionLink>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-surface-600 transition motion-reduce:transition-none hover:border-brand-orange hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              aria-label="Close fork lineage"
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

      {integrityNotice && (
        <div
          role="status"
          className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-950 sm:px-5"
          data-fork-lineage-integrity={lineage.integrity.kind}
          data-affected-project-id={lineage.integrity.affectedProjectId}
        >
          {integrityNotice}
        </div>
      )}

      <nav
        aria-label="Fork lineage generations"
        className="border-b border-surface-200 bg-surface-50 px-3 py-3 sm:px-4"
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              scrollToLevel(generations[Math.max(0, activeGenerationIndex - 1)]?.displayLevel ?? 1)
            }}
            disabled={isAtFirstLevel}
            aria-label="Show previous fork generation"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border border-surface-300 bg-white text-surface-700 hover:border-brand-orange disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-surface-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {generations.map((generation) => (
            <button
              key={generation.projectId}
              type="button"
              onClick={() => scrollToLevel(generation.displayLevel)}
              data-fork-generation-nav={generation.displayLevel}
              data-active-view={generation.displayLevel === activeLevel ? 'true' : 'false'}
              aria-label={`Show level ${generation.displayLevel}, ${generation.title}${generation.isCurrent ? ', current generation' : ''}`}
              aria-current={generation.isCurrent ? 'step' : undefined}
              aria-pressed={generation.displayLevel === activeLevel}
              className={[
                'inline-flex min-h-11 shrink-0 items-center justify-center border px-3 py-2 text-xs font-black uppercase tracking-[0.08em] transition motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                generation.displayLevel === activeLevel
                  ? 'border-surface-900 bg-surface-900 text-white'
                  : generation.isCurrent
                    ? 'border-brand-blue bg-white text-brand-blue'
                    : 'border-surface-300 bg-white text-surface-700 hover:border-brand-orange hover:text-brand-orange-ink',
              ].join(' ')}
            >
              Level {generation.displayLevel}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              scrollToLevel(generations[Math.min(generations.length - 1, activeGenerationIndex + 1)]?.displayLevel ?? 1)
            }}
            disabled={isAtLastLevel}
            aria-label="Show next fork generation"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border border-surface-300 bg-white text-surface-700 hover:border-brand-orange disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-surface-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <div id={`fork-lineage-edges-${branch.id}`} className="sr-only">
        <p>
          This horizontal fork lineage contains {generations.length} project levels and {renderedEdgeCount} response-to-prompt connections.
        </p>
        <ol>
          {generations.slice(1).map((generation, index) => {
            const parent = generations[index]
            const edge = generation.incomingEdge
            if (!edge) return null
            return (
              <li key={`${parent.projectId}:${generation.projectId}`}>
                Level {parent.displayLevel}, {parent.title}, response {edge.sourceResponse.stepNumber ?? edge.sourceResponse.stepId} connects to level {generation.displayLevel}, {generation.title}, prompt {edge.targetPrompt.stepNumber}.
              </li>
            )
          })}
        </ol>
      </div>

      <div
        ref={viewportRef}
        role="region"
        aria-label="Fork lineage horizontal workspace"
        aria-describedby={`fork-lineage-edges-${branch.id}`}
        tabIndex={0}
        onKeyDown={handleWorkspaceKeyDown}
        className="max-w-full snap-x snap-mandatory scroll-px-4 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain bg-surface-50 px-4 py-5 [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange sm:scroll-px-5 sm:px-5"
        data-fork-generation-workspace
      >
        <div
          ref={canvasRef}
          className="relative flex w-max min-w-full items-start gap-24 pb-3"
          data-fork-generation-canvas
        >
          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
            aria-hidden="true"
            data-fork-generation-connectors
          >
            {connectors.map((connector) => {
              const middleX = connector.sourceX + Math.max(28, (connector.targetX - connector.sourceX) / 2)
              const path = [
                `M ${connector.sourceX} ${connector.sourceY}`,
                `H ${middleX}`,
                `V ${connector.targetY}`,
                `H ${connector.targetX}`,
              ].join(' ')
              return (
                <g
                  key={`${connector.parentGenerationId}:${connector.childGenerationId}`}
                  data-testid={`fork-edge-${connector.fromLevel}-${connector.toLevel}`}
                  data-fork-generation-connector
                  data-parent-generation-id={connector.parentGenerationId}
                  data-child-generation-id={connector.childGenerationId}
                  data-parent-response-id={connector.parentResponseId}
                  data-parent-response-package-id={connector.parentResponsePackageId}
                  data-parent-local-step-id={connector.parentLocalStepId}
                  data-parent-response-anchor-id={connector.parentResponseAnchorId}
                  data-child-prompt-id={connector.childPromptId}
                  data-stored-depth={connector.storedDepth}
                  data-branch-index={connector.branchIndex}
                  data-prompt-family-id={connector.promptFamilyId}
                  data-source-run-id={connector.sourceRunId}
                  data-source-artifact-path={connector.sourceArtifactPath}
                  data-source-artifact-sha256={connector.sourceArtifactSha256}
                >
                  <path
                    d={path}
                    fill="none"
                    stroke="#8f3f0a"
                    strokeWidth="14"
                    strokeLinejoin="miter"
                  />
                  <path
                    d={path}
                    fill="none"
                    stroke="#e87a2c"
                    strokeWidth="8"
                    strokeLinejoin="miter"
                  />
                  <circle cx={connector.sourceX} cy={connector.sourceY} r="8" fill="#e87a2c" stroke="#8f3f0a" strokeWidth="4" />
                  <circle cx={connector.targetX} cy={connector.targetY} r="8" fill="#e87a2c" stroke="#8f3f0a" strokeWidth="4" />
                </g>
              )
            })}
          </svg>

          {generations.map((generation, index) => (
            <GenerationLane
              key={generation.projectId}
              generation={generation}
              outgoingEdge={generations[index + 1]?.incomingEdge ?? null}
              maxDepth={lineage.maxLevels}
              eligibility={lineage.eligibility}
              snapAlignment={
                index === 0
                  ? 'start'
                  : index === generations.length - 1
                    ? 'end'
                    : 'center'
              }
              selectedArtifactPath={selectedArtifactPath}
              artifactOpenHrefs={artifactOpenHrefs}
              isArtifactDisplayable={isArtifactDisplayable}
              onDisplayArtifact={onDisplayArtifact}
            />
          ))}
        </div>
      </div>

      <footer
        className="border-t border-surface-200 bg-white px-4 py-3 text-sm leading-6 text-surface-700 sm:px-5"
        data-fork-eligibility={lineage.eligibility.allowed ? 'allowed' : 'denied'}
        data-fork-eligibility-reason={lineage.eligibility.reason}
      >
        <span className="font-black">
          {lineage.eligibility.allowed ? 'Fork available.' : 'Fork unavailable.'}
        </span>{' '}
        {eligibilityMessage(lineage.eligibility.reason)}
      </footer>
    </section>
  )
}
