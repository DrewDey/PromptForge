import Link from 'next/link'
import { ArrowRight, GitBranch, MessageSquare } from 'lucide-react'
import { getPromptById } from '@/lib/data'
import { getProjectRouteOverride } from '@/lib/project-links'
import {
  PROJECT_FORK_MAX_DEPTH,
  PROJECT_FORK_MAX_WIDTH,
  createProjectForkDraftContract,
  groupProjectForkNetworkBySourceStep,
  projectForkSourceFromSubmissionFields,
  resolveProjectForkTrail,
  toProjectForkSourceSteps,
  type ProjectForkLineageSegment,
  type ProjectForkNetworkItem,
  type ProjectForkSource,
  type ProjectForkSourceStep,
  type ProjectForkTrailNode,
} from '@/lib/project-forks'
import type { PromptWithRelations } from '@/lib/types'

function compactForkText(value: string | null | undefined, fallback: string, max = 110) {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed
}

function projectHref(projectId: string) {
  return getProjectRouteOverride(projectId) ?? `/prompt/${projectId}`
}

function ProjectForkOriginBand({ forkSource }: { forkSource: ProjectForkSource }) {
  const sourceHref = projectHref(forkSource.sourceProjectId)
  const depthValue = Math.min(forkSource.depth + 1, PROJECT_FORK_MAX_DEPTH)
  const branchValue = Math.min(forkSource.branchIndex + 1, PROJECT_FORK_MAX_WIDTH)

  return (
    <div className="mb-6 overflow-hidden border border-[#07551f] bg-white shadow-[0_18px_44px_rgba(7,85,31,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative p-5">
          <div className="absolute left-0 top-0 h-full w-3 border-x-2 border-[#07551f] bg-[#2bd15f] shadow-[inset_3px_0_0_rgba(255,255,255,0.24),inset_-3px_0_0_rgba(0,0,0,0.18)]" aria-hidden="true" />
          <div className="pl-5">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              Fork lineage
            </div>
            <h2 className="mt-2 text-xl font-black text-surface-900">
              Forked from {forkSource.sourceProjectTitle || 'an existing PathForge project'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600">
              {forkSource.sourceStepNumber && (
                <span className="border border-[#07551f]/30 bg-[#effdf3] px-2 py-1 text-[#07551f]">
                  Response {String(forkSource.sourceStepNumber).padStart(2, '0')}
                </span>
              )}
              {forkSource.promptFamilyId && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Prompt family attached
                </span>
              )}
            </div>
            <Link
              href={sourceHref}
              className="mt-4 inline-flex items-center gap-2 border border-[#07551f] bg-[#effdf3] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#07551f] transition hover:bg-white"
            >
              Open source path
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <aside className="border-t border-[#07551f] bg-[#effdf3] p-5 lg:border-l lg:border-t-0">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
            Coordinates
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="border border-[#07551f]/20 bg-white px-3 py-2">
              <div className="text-xs text-surface-500">Depth</div>
              <div className="mt-1 text-xl font-black text-surface-900">{depthValue} / {PROJECT_FORK_MAX_DEPTH}</div>
            </div>
            <div className="border border-[#07551f]/20 bg-white px-3 py-2">
              <div className="text-xs text-surface-500">Branch</div>
              <div className="mt-1 text-xl font-black text-surface-900">{branchValue} / {PROJECT_FORK_MAX_WIDTH}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ForkLineageSegmentCard({
  segment,
  label,
}: {
  segment: ProjectForkLineageSegment
  label?: string
}) {
  const isForkPoint = segment.state === 'fork-point'
  const stateLabel = label ?? (
    segment.muted ? 'Original continuation' : isForkPoint ? 'Fork point' : 'Shared'
  )

  return (
    <div
      className={[
        'group/inherited-step relative border px-3 py-2 text-left transition',
        segment.muted
          ? 'border-surface-200 bg-surface-100 text-surface-400 opacity-70 hover:opacity-100'
          : isForkPoint
            ? 'border-[#07551f] bg-[#effdf3] text-surface-900 ring-2 ring-[#2bd15f]/30'
            : 'border-surface-300 bg-white text-surface-800 hover:border-[#07551f]',
      ].join(' ')}
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
          Response {String(segment.stepNumber).padStart(2, '0')}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
          {stateLabel}
        </span>
      </div>
      <div className="mt-1 text-sm font-black">
        {compactForkText(segment.promptTitle, `Prompt ${segment.stepNumber}`, 64)}
      </div>
      <div className="mt-1 text-xs leading-5">
        {compactForkText(segment.responseText, 'Response package captured', 92)}
      </div>
      <div className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-20 hidden w-[min(420px,calc(100vw-48px))] border border-surface-800 bg-surface-950 p-3 text-left text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)] group-hover/inherited-step:block group-focus-within/inherited-step:block">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#2bd15f]">
          Original text preview
        </div>
        <div className="mt-2 grid gap-2 text-xs leading-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">Prompt</div>
            <p className="mt-1 text-surface-100">{compactForkText(segment.promptText, 'Prompt text captured', 260)}</p>
          </div>
          <div className="border-t border-surface-800 pt-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">Response</div>
            <p className="mt-1 text-surface-100">{compactForkText(segment.responseText, 'Response text captured', 260)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ForkContinuationCard({ step }: { step: ProjectForkSourceStep }) {
  return (
    <div className="group/fork-continuation relative border border-[#07551f]/25 bg-white px-3 py-2 pl-10 transition hover:border-[#07551f] hover:shadow-[0_12px_28px_rgba(7,85,31,0.1)]" tabIndex={0}>
      <span className="absolute left-0 top-1/2 h-1 w-8 -translate-y-1/2 border-y border-[#07551f] bg-[#2bd15f]" aria-hidden="true" />
      <span className="absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 border-2 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_4px_rgba(43,209,95,0.14)]" aria-hidden="true" />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#07551f]">
          Fork response {String(step.stepNumber).padStart(2, '0')}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">
          New path
        </span>
      </div>
      <div className="mt-1 text-sm font-black text-surface-900">
        {compactForkText(step.promptTitle, `Prompt ${step.stepNumber}`, 64)}
      </div>
      <div className="mt-1 text-xs leading-5 text-surface-600">
        {compactForkText(step.responseText, 'Fork response package captured', 92)}
      </div>
    </div>
  )
}

function MobileForkBreak({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center py-3" aria-hidden="true">
      <div className="absolute left-1/2 top-0 h-full w-3 -translate-x-1/2 border-x-2 border-[#07551f] bg-[#2bd15f] shadow-[inset_3px_0_0_rgba(255,255,255,0.24),inset_-3px_0_0_rgba(0,0,0,0.18)]" />
      <div className="relative border-2 border-[#07551f] bg-[#effdf3] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#07551f] shadow-[0_0_0_6px_rgba(43,209,95,0.16)]">
        {label}
      </div>
    </div>
  )
}

function ProjectForkTrailNodeCard({
  node,
  index,
}: {
  node: ProjectForkTrailNode
  index: number
}) {
  const href = projectHref(node.id)
  const responseLabel = node.forkSource?.sourceStepNumber
    ? `From response ${String(node.forkSource.sourceStepNumber).padStart(2, '0')}`
    : node.forkSource?.sourceStepId
      ? 'Exact response attached'
      : 'Source root'
  const layerLabel = index === 0
    ? 'Original path'
    : node.isCurrent
      ? 'Current path'
      : `Fork layer ${String(index).padStart(2, '0')}`
  const card = (
    <div
      className={[
        'group/fork-trail-node relative h-full min-h-[132px] border p-4 text-left transition',
        node.isCurrent
          ? 'border-[#07551f] bg-[#effdf3] shadow-[0_14px_34px_rgba(7,85,31,0.14)]'
          : node.isMissingSource
            ? 'border-dashed border-surface-300 bg-surface-50 text-surface-500'
            : 'border-surface-200 bg-white hover:-translate-y-0.5 hover:border-[#07551f] hover:shadow-[0_14px_34px_rgba(7,85,31,0.1)]',
      ].join(' ')}
    >
      <span
        className={[
          'absolute -left-2 top-5 h-4 w-4 border-2',
          node.isCurrent
            ? 'border-[#07551f] bg-[#2bd15f] shadow-[0_0_0_6px_rgba(43,209,95,0.18)] motion-safe:animate-pulse'
            : 'border-surface-300 bg-white',
        ].join(' ')}
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
        <span className={node.isCurrent ? 'text-[#07551f]' : undefined}>{layerLabel}</span>
        <span className="border border-surface-200 bg-white px-2 py-1 text-surface-500">
          {responseLabel}
        </span>
      </div>
      <div className="mt-3 text-base font-black leading-5 text-surface-900">
        {compactForkText(node.title, 'Untitled path', 74)}
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">
        {node.isCurrent ? 'You are here' : node.isMissingSource ? 'Source unavailable' : 'Openable ancestor'}
      </div>
    </div>
  )

  if (node.isCurrent || node.isMissingSource) return card

  return (
    <Link href={href} className="block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]">
      {card}
    </Link>
  )
}

function ProjectForkAncestryTrail({ nodes }: { nodes: ProjectForkTrailNode[] }) {
  if (nodes.length < 2) return null

  return (
    <div className="mb-8 overflow-hidden border border-[#07551f] bg-white shadow-[0_18px_44px_rgba(7,85,31,0.08)]">
      <div className="border-b border-[#07551f] bg-[#f8fff9] p-5">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          Fork ancestry
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <h2 className="text-xl font-black text-surface-900">
            {nodes.length} linked path layers.
          </h2>
          <div className="border border-[#07551f]/25 bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#07551f]">
            Max depth {PROJECT_FORK_MAX_DEPTH}
          </div>
        </div>
      </div>

      <div className="grid gap-0 p-4 lg:hidden">
        {nodes.map((node, index) => (
          <div key={`${node.id}-${index}`}>
            <ProjectForkTrailNodeCard node={node} index={index} />
            {index < nodes.length - 1 && <MobileForkBreak label="Fork hop" />}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <ol className="flex min-w-[900px] items-stretch p-5">
          {nodes.map((node, index) => (
            <li
              key={`${node.id}-${index}`}
              className="flex min-w-[230px] flex-1 items-stretch"
              style={{ marginTop: `${Math.min(index, 5) * 12}px` }}
            >
              <ProjectForkTrailNodeCard node={node} index={index} />
              {index < nodes.length - 1 && (
                <div className="relative w-16 shrink-0" aria-hidden="true">
                  <div className="absolute left-0 top-12 h-4 w-full border-y-2 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_3px_0_rgba(255,255,255,0.22),inset_0_-3px_0_rgba(0,0,0,0.16)]" />
                  <div className="absolute left-1/2 top-9 h-10 w-10 -translate-x-1/2 border-2 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_6px_rgba(43,209,95,0.16)]" />
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function ProjectForkInheritedPathBand({
  forkSource,
  sourceProject,
  currentProject,
}: {
  forkSource: ProjectForkSource
  sourceProject: PromptWithRelations | null
  currentProject: PromptWithRelations
}) {
  if (!sourceProject) return null

  const sourceSteps = toProjectForkSourceSteps(sourceProject)
  const currentSteps = toProjectForkSourceSteps(currentProject)
  if (sourceSteps.length === 0 || currentSteps.length === 0) return null
  const continuationSteps = forkSource.sourceStepNumber
    ? currentSteps.filter((step) => step.stepNumber > (forkSource.sourceStepNumber ?? 0))
    : currentSteps
  const visibleContinuationSteps = continuationSteps.length > 0 ? continuationSteps : currentSteps

  const contract = createProjectForkDraftContract({ source: forkSource, sourceSteps })
  const sharedSegments = contract.lineageSegments.filter((segment) => segment.state === 'shared-history')
  const forkPointSegment = contract.lineageSegments.find((segment) => segment.state === 'fork-point')
  const originalContinuationSegments = contract.lineageSegments.filter((segment) => segment.state === 'original-continuation')
  const forkPointLabel = forkPointSegment
    ? `Response ${String(forkPointSegment.stepNumber).padStart(2, '0')}`
    : 'the selected response'

  return (
    <div className="mb-8 overflow-hidden border border-[#07551f] bg-[#f8fff9] shadow-[0_18px_44px_rgba(7,85,31,0.08)]">
      <div className="border-b border-[#07551f] bg-white p-5">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          Inherited fork path
        </div>
        <h2 className="mt-2 text-xl font-black text-surface-900">
          This fork branches from {forkPointLabel}.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">
          The shared source path collapses left. The source path after the fork point is muted, and this project&apos;s continuation runs right.
        </p>
      </div>

      <div className="grid gap-4 p-4 lg:hidden">
        <section className="border border-surface-200 bg-white p-3">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-500">
            Source path collapses first
          </div>
          <div className="mt-2 text-sm font-black text-surface-900">
            {sourceProject.title}
          </div>
          <div className="mt-3 grid gap-2">
            {sharedSegments.length > 0 ? sharedSegments.map((segment) => (
              <ForkLineageSegmentCard key={segment.id} segment={segment} />
            )) : (
              <div className="border border-dashed border-surface-300 bg-surface-50 px-3 py-2 text-xs leading-5 text-surface-500">
                Fork starts from the first response.
              </div>
            )}
            {forkPointSegment && (
              <ForkLineageSegmentCard segment={forkPointSegment} />
            )}
          </div>
          {originalContinuationSegments.length > 0 && (
            <div className="mt-4 border-t border-surface-200 pt-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-400">
                Muted source continuation
              </div>
              <div className="mt-2 grid gap-2">
                {originalContinuationSegments.map((segment) => (
                  <ForkLineageSegmentCard key={segment.id} segment={segment} />
                ))}
              </div>
            </div>
          )}
        </section>

        <MobileForkBreak label="Branch point" />

        <section className="border-2 border-[#07551f] bg-white p-3 shadow-[0_12px_28px_rgba(7,85,31,0.08)]">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
            Current fork continues
          </div>
          <div className="mt-2 text-sm font-black text-surface-900">
            {currentProject.title}
          </div>
          <div className="mt-3 grid gap-2">
            {visibleContinuationSteps.map((step) => (
              <ForkContinuationCard key={step.id} step={step} />
            ))}
          </div>
        </section>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <div className="min-w-[940px] p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_86px_minmax(0,1fr)] items-start">
            <section className="border border-surface-200 bg-white p-4">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-500">
                Source path collapses left
              </div>
              <div className="mt-2 text-sm font-black text-surface-900">
                {sourceProject.title}
              </div>
              <div className="mt-3 grid gap-2">
                {sharedSegments.length > 0 ? sharedSegments.map((segment) => (
                  <ForkLineageSegmentCard key={segment.id} segment={segment} />
                )) : (
                  <div className="border border-dashed border-surface-300 bg-surface-50 px-3 py-2 text-xs leading-5 text-surface-500">
                    Fork starts from the first response.
                  </div>
                )}
                {forkPointSegment && (
                  <ForkLineageSegmentCard segment={forkPointSegment} />
                )}
              </div>

              {originalContinuationSegments.length > 0 && (
                <div className="mt-4 border-t border-surface-200 pt-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-400">
                    Source continuation after fork point
                  </div>
                  <div className="mt-2 grid gap-2">
                    {originalContinuationSegments.map((segment) => (
                      <ForkLineageSegmentCard key={segment.id} segment={segment} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="relative h-full min-h-[280px]" aria-hidden="true">
              <div className="absolute left-1/2 top-0 h-full w-8 -translate-x-1/2 border-x-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_5px_0_0_rgba(255,255,255,0.24),inset_-5px_0_0_rgba(0,0,0,0.2)]" />
              <div className="absolute left-0 top-[116px] h-8 w-full border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.2),inset_0_-5px_0_rgba(0,0,0,0.16)]" />
              <div className="absolute left-1/2 top-[102px] h-16 w-16 -translate-x-1/2 border-4 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_9px_rgba(43,209,95,0.16)] motion-safe:animate-pulse" />
            </div>

            <section className="border-2 border-[#07551f] bg-white p-4 shadow-[0_18px_44px_rgba(7,85,31,0.08)]">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
                Current fork continues right
              </div>
              <div className="mt-2 text-sm font-black text-surface-900">
                {currentProject.title}
              </div>
              <div className="mt-3 grid gap-2">
                {visibleContinuationSteps.map((step) => (
                  <ForkContinuationCard key={step.id} step={step} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectForkNetworkBand({
  forks,
  projectTitle,
  sourceSteps,
}: {
  forks: ProjectForkNetworkItem[]
  projectTitle?: string
  sourceSteps: ProjectForkSourceStep[]
}) {
  if (forks.length === 0) return null

  const { rows: sourceRows, unmatchedForks } = groupProjectForkNetworkBySourceStep(sourceSteps, forks)

  return (
    <div className="mb-10 overflow-hidden border border-[#07551f] bg-[#f8fff9]">
      <div className="border-b border-[#07551f] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              Fork map
            </div>
            <h2 className="mt-2 text-xl font-black text-surface-900">
              Approved branches from {projectTitle || 'this path'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-surface-600">
              Source responses stay collapsed on the left. Approved fork lanes branch right from the response that created them.
            </p>
          </div>
          <div className="border border-[#07551f]/25 bg-[#effdf3] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#07551f]">Active forks</div>
            <div className="mt-1 text-3xl font-black text-surface-900">
              {forks.length} / {PROJECT_FORK_MAX_WIDTH}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:hidden">
        {sourceRows.length > 0 ? sourceRows.map(({ step, forks: rowForks }) => (
          <MobileForkNetworkRow key={step.id} step={step} forks={rowForks} />
        )) : forks.map((fork) => (
          <ForkNetworkBranchCard key={fork.id} fork={fork} />
        ))}

        {unmatchedForks.length > 0 && sourceRows.length > 0 && (
          <section className="border-t border-[#07551f]/25 pt-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-surface-500">
              Branches with missing source-step metadata
            </div>
            <div className="grid gap-3">
              {unmatchedForks.map((fork) => (
                <ForkNetworkBranchCard key={fork.id} fork={fork} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <div className="min-w-[860px] p-5">
          {sourceRows.length > 0 ? (
            <div className="grid gap-3">
              {sourceRows.map(({ step, forks: rowForks }) => (
                <ForkNetworkRow
                  key={step.id}
                  step={step}
                  forks={rowForks}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {forks.map((fork) => (
                <ForkNetworkBranchCard key={fork.id} fork={fork} />
              ))}
            </div>
          )}

          {unmatchedForks.length > 0 && sourceRows.length > 0 && (
            <div className="mt-4 border-t border-[#07551f]/25 pt-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-surface-500">
                Branches with missing source-step metadata
              </div>
              <div className="grid gap-3">
                {unmatchedForks.map((fork) => (
                  <ForkNetworkBranchCard key={fork.id} fork={fork} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MobileForkNetworkRow({
  step,
  forks,
}: {
  step: ProjectForkSourceStep
  forks: ProjectForkNetworkItem[]
}) {
  const hasForks = forks.length > 0

  return (
    <section className="border border-surface-200 bg-white p-3">
      <div className="group/mobile-fork-source relative border border-surface-200 bg-surface-50 px-3 py-2" tabIndex={0}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#07551f]">
            Response {String(step.stepNumber).padStart(2, '0')}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">
            {hasForks ? `${forks.length} branch${forks.length > 1 ? 'es' : ''}` : 'Shared'}
          </span>
        </div>
        <div className="mt-1 text-sm font-black text-surface-900">
          {compactForkText(step.promptTitle, `Prompt ${step.stepNumber}`, 64)}
        </div>
        <div className="mt-1 text-xs leading-5 text-surface-600">
          {compactForkText(step.responseText, 'Response package captured', 92)}
        </div>
        <div className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-20 hidden w-[min(420px,calc(100vw-48px))] border border-surface-800 bg-surface-950 p-3 text-left text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)] group-hover/mobile-fork-source:block group-focus-within/mobile-fork-source:block">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#2bd15f]">
            Original text preview
          </div>
          <div className="mt-2 grid gap-2 text-xs leading-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">Prompt</div>
              <p className="mt-1 text-surface-100">{compactForkText(step.promptText, 'Prompt text captured', 260)}</p>
            </div>
            <div className="border-t border-surface-800 pt-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">Response</div>
              <p className="mt-1 text-surface-100">{compactForkText(step.responseText, 'Response text captured', 260)}</p>
            </div>
          </div>
        </div>
      </div>

      {hasForks ? (
        <>
          <MobileForkBreak label="Branches right" />
          <div className="grid gap-3">
            {forks.map((fork) => (
              <ForkNetworkBranchCard key={fork.id} fork={fork} />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-3 border border-dashed border-surface-200 bg-white/70 px-3 py-2 text-xs leading-5 text-surface-400">
          No approved branch has left this response yet.
        </div>
      )}
    </section>
  )
}

function ForkNetworkRow({
  step,
  forks,
}: {
  step: ProjectForkSourceStep
  forks: ProjectForkNetworkItem[]
}) {
  const hasForks = forks.length > 0

  return (
    <div className="grid grid-cols-[260px_72px_minmax(0,1fr)] items-stretch">
      <div
        className={[
          'group/fork-source relative border px-3 py-3 transition',
          hasForks
            ? 'border-[#07551f] bg-white shadow-[0_12px_28px_rgba(7,85,31,0.08)]'
            : 'border-surface-200 bg-surface-100 text-surface-500',
        ].join(' ')}
        tabIndex={0}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#07551f]">
            Response {String(step.stepNumber).padStart(2, '0')}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">
            {hasForks ? `${forks.length} branch${forks.length > 1 ? 'es' : ''}` : 'Shared'}
          </span>
        </div>
        <div className="mt-1 text-sm font-black text-surface-900">
          {compactForkText(step.promptTitle, `Prompt ${step.stepNumber}`, 60)}
        </div>
        <div className="mt-1 text-xs leading-5">
          {compactForkText(step.responseText, 'Response package captured', 82)}
        </div>
        <div className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-20 hidden w-[min(420px,calc(100vw-48px))] border border-surface-800 bg-surface-950 p-3 text-left text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)] group-hover/fork-source:block group-focus-within/fork-source:block">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#2bd15f]">
            Original text preview
          </div>
          <div className="mt-2 grid gap-2 text-xs leading-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">Prompt</div>
              <p className="mt-1 text-surface-100">{compactForkText(step.promptText, 'Prompt text captured', 260)}</p>
            </div>
            <div className="border-t border-surface-800 pt-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">Response</div>
              <p className="mt-1 text-surface-100">{compactForkText(step.responseText, 'Response text captured', 260)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-full w-3 -translate-x-1/2 border-x-2 border-[#07551f] bg-[#2bd15f] opacity-70 shadow-[inset_3px_0_0_rgba(255,255,255,0.24),inset_-3px_0_0_rgba(0,0,0,0.18)]" />
        {hasForks && (
          <>
            <div className="absolute left-0 top-1/2 h-3 w-full -translate-y-1/2 border-y-2 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_3px_0_rgba(255,255,255,0.22),inset_0_-3px_0_rgba(0,0,0,0.16)]" />
            <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 border-2 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_6px_rgba(43,209,95,0.18)] motion-safe:animate-pulse" />
          </>
        )}
      </div>

      <div
        className={[
          'min-h-[104px] border p-3',
          hasForks ? 'border-[#07551f]/25 bg-white' : 'border-dashed border-surface-200 bg-white/60',
        ].join(' ')}
      >
        {hasForks ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {forks.map((fork) => (
              <ForkNetworkBranchCard key={fork.id} fork={fork} />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center text-xs leading-5 text-surface-400">
            No approved branch has left this response yet.
          </div>
        )}
      </div>
    </div>
  )
}

function ForkNetworkBranchCard({ fork }: { fork: ProjectForkNetworkItem }) {
  const forkHref = getProjectRouteOverride(fork.id) ?? `/prompt/${fork.id}`
  const responseNumber = fork.forkSource.sourceStepNumber
    ? String(fork.forkSource.sourceStepNumber).padStart(2, '0')
    : null

  return (
    <Link
      href={forkHref}
      className="group relative block border border-[#07551f]/25 bg-white p-4 pl-12 transition hover:-translate-y-0.5 hover:border-[#07551f] hover:shadow-[0_14px_32px_rgba(7,85,31,0.12)]"
    >
      <span className="absolute left-0 top-1/2 h-1 w-10 -translate-y-1/2 border-y border-[#07551f] bg-[#2bd15f]" aria-hidden="true" />
      <span className="absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_4px_rgba(43,209,95,0.18)]" aria-hidden="true" />
      <span className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-surface-500">
        {responseNumber && (
          <span className="border border-[#07551f]/30 bg-[#effdf3] px-2 py-1 text-[#07551f]">
            From response {responseNumber}
          </span>
        )}
        {fork.modelUsed && <span>{fork.modelUsed}</span>}
      </span>
      <span className="mt-2 flex items-start justify-between gap-3">
        <span>
          <span className="block text-lg font-black text-surface-900 group-hover:text-[#07551f]">
            {fork.title}
          </span>
          {fork.description && (
            <span className="mt-1 line-clamp-2 block text-sm leading-5 text-surface-600">
              {fork.description}
            </span>
          )}
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#07551f] transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  )
}

export default async function ProjectCommunityPanel({
  projectId,
}: {
  projectId: string
}) {
  const project = await getPromptById(projectId)
  const sourceSteps = project ? toProjectForkSourceSteps(project) : []
  const forkSource = project ? projectForkSourceFromSubmissionFields(project) : null
  const forkTrail = project
    ? await resolveProjectForkTrail(project, getPromptById)
    : { nodes: [], immediateSourceProject: null, cycleDetected: false, truncated: false }
  const sourceProject = forkTrail.immediateSourceProject

  return (
    <section
      className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8 lg:pb-14"
      data-project-id={projectId}
    >
      {forkSource && <ProjectForkOriginBand forkSource={forkSource} />}
      {forkSource && <ProjectForkAncestryTrail nodes={forkTrail.nodes} />}
      {forkSource && project && (
        <ProjectForkInheritedPathBand
          forkSource={forkSource}
          sourceProject={sourceProject}
          currentProject={project}
        />
      )}
      <div className="border-t border-surface-200 pt-10">
        <div>
          <div className="mb-5 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-brand-blue" aria-hidden="true" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                Discussion
              </div>
              <h2 className="text-2xl font-black text-surface-900">Comments and replies</h2>
            </div>
          </div>

          <div className="border border-dashed border-surface-300 bg-white px-4 py-6 text-sm text-surface-500">
            No comments yet.
          </div>
        </div>
      </div>
    </section>
  )
}
