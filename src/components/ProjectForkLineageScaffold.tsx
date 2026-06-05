import { ArrowRight, GitFork } from 'lucide-react'
import {
  createProjectForkDraftContract,
  type ProjectForkLineageSegment,
  type ProjectForkSource,
  type ProjectForkSourceStep,
} from '@/lib/project-forks'

function compactText(text: string | null | undefined, fallback: string, max = 88) {
  const trimmed = text?.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed
}

function previewText(segment: ProjectForkSourceStep) {
  const prompt = compactText(segment.promptText, 'Prompt text captured', 260)
  const response = compactText(segment.responseText, 'Response text captured', 260)
  return { prompt, response }
}

function ForkPreviewPopover({ segment }: { segment: ProjectForkSourceStep }) {
  const preview = previewText(segment)

  return (
    <div className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-20 hidden w-[min(420px,calc(100vw-48px))] border border-surface-800 bg-surface-950 p-3 text-left text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)] group-hover/fork-segment:block group-focus-within/fork-segment:block">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#2bd15f]">
        Original text preview
      </div>
      <div className="mt-2 grid gap-2 text-xs leading-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">Prompt</div>
          <p className="mt-1 text-surface-100">{preview.prompt}</p>
        </div>
        <div className="border-t border-surface-800 pt-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-400">Response</div>
          <p className="mt-1 text-surface-100">{preview.response}</p>
        </div>
      </div>
    </div>
  )
}

function ForkSegmentChip({ segment }: { segment: ProjectForkLineageSegment }) {
  const isForkPoint = segment.state === 'fork-point'
  const label = segment.muted ? 'Original path' : isForkPoint ? 'Fork socket' : 'Shared'
  const className = [
    'group/fork-segment relative border px-3 py-2 text-left transition',
    segment.muted
      ? 'border-surface-200 bg-surface-100 text-surface-400 opacity-75 hover:opacity-100'
      : isForkPoint
        ? 'border-[#07551f] bg-[#effdf3] text-surface-900 ring-2 ring-[#2bd15f]/30'
        : 'border-surface-300 bg-white text-surface-800 hover:border-[#07551f]',
  ].join(' ')

  return (
    <div className={className} tabIndex={0}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
          Response {String(segment.stepNumber).padStart(2, '0')}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <div className="mt-1 text-sm font-black">
        {compactText(segment.promptTitle, `Prompt ${segment.stepNumber}`, 64)}
      </div>
      <div className="mt-1 text-xs leading-5">
        {compactText(segment.responseText, 'Response package captured', 92)}
      </div>
      <ForkPreviewPopover segment={segment} />
    </div>
  )
}

function CapacityDots({
  value,
  max,
  label,
}: {
  value: number
  max: number
  label: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-500">{label}</div>
        <div className="font-mono text-[10px] font-bold text-surface-900">{value} / {max}</div>
      </div>
      <div className="mt-2 grid grid-cols-10 gap-1">
        {Array.from({ length: max }).map((_, index) => (
          <span
            key={`${label}-${index}`}
            className={[
              'h-2 border',
              index < value
                ? 'border-[#07551f] bg-[#2bd15f]'
                : 'border-surface-200 bg-surface-50',
            ].join(' ')}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}

function MobileForkLineageBreak({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center py-3" aria-hidden="true">
      <div className="absolute left-1/2 top-0 h-full w-3 -translate-x-1/2 border-x-2 border-[#07551f] bg-[#2bd15f] shadow-[inset_3px_0_0_rgba(255,255,255,0.24),inset_-3px_0_0_rgba(0,0,0,0.18)]" />
      <div className="relative border-2 border-[#07551f] bg-[#effdf3] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#07551f] shadow-[0_0_0_6px_rgba(43,209,95,0.16)]">
        {label}
      </div>
    </div>
  )
}

export default function ProjectForkLineageScaffold({
  source,
  sourceSteps,
}: {
  source: Partial<ProjectForkSource> & { sourceProjectId: string }
  sourceSteps: ProjectForkSourceStep[]
}) {
  if (sourceSteps.length === 0) return null

  const contract = createProjectForkDraftContract({ source, sourceSteps })
  const forkPointStep = contract.forkPointStep
  const sharedSegments = contract.lineageSegments.filter((segment) => segment.state === 'shared-history')
  const originalContinuationSegments = contract.lineageSegments.filter((segment) => segment.state === 'original-continuation')
  const forkPointSegment = contract.lineageSegments.find((segment) => segment.state === 'fork-point')
  const depthValue = Math.min(contract.source.depth + 1, contract.maxDepth)
  const branchValue = Math.min(contract.source.branchIndex + 1, contract.maxWidth)
  const forkLabel = forkPointStep
    ? `Response ${String(forkPointStep.stepNumber).padStart(2, '0')}`
    : 'Last response'

  return (
    <div className="border-t border-surface-200 bg-surface-50">
      <div className="grid gap-4 p-4 lg:hidden">
        <section className="border border-surface-200 bg-white p-4">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-500">
            Shared path collapses first
          </div>
          <div className="mt-2 text-sm font-black text-surface-900">
            {sharedSegments.length > 0 ? `${sharedSegments.length} earlier response${sharedSegments.length > 1 ? 's' : ''}` : 'No earlier shared steps'}
          </div>
          <div className="mt-3 grid gap-2">
            {sharedSegments.length > 0 ? sharedSegments.map((segment) => (
              <ForkSegmentChip key={segment.id} segment={segment} />
            )) : (
              <div className="border border-dashed border-surface-300 bg-surface-50 px-3 py-2 text-xs leading-5 text-surface-500">
                Fork starts from the first response.
              </div>
            )}
          </div>
          {originalContinuationSegments.length > 0 && (
            <div className="mt-4 border-t border-surface-200 pt-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-400">
                Original path after fork point
              </div>
              <div className="mt-2 grid gap-2">
                {originalContinuationSegments.map((segment) => (
                  <ForkSegmentChip key={segment.id} segment={segment} />
                ))}
              </div>
            </div>
          )}
        </section>

        <MobileForkLineageBreak label="Fork socket" />

        <section className="border-2 border-[#07551f] bg-white p-4 shadow-[0_12px_28px_rgba(7,85,31,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
                <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
                New fork lane
              </div>
              <div className="mt-2 text-base font-black text-surface-900">
                Branch starts from {forkLabel}
              </div>
            </div>
            <div className="border border-[#07551f] bg-[#effdf3] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#07551f]">
              Live handoff
            </div>
          </div>

          {forkPointSegment && (
            <div className="mt-4">
              <ForkSegmentChip segment={forkPointSegment} />
            </div>
          )}

          <div className="mt-4 grid gap-3 border border-dashed border-[#07551f] bg-[#effdf3] p-3">
            <div className="flex items-center gap-2 text-sm font-black text-surface-900">
              <ArrowRight className="h-4 w-4 text-[#07551f]" aria-hidden="true" />
              Your next prompt continues here
            </div>
            <p className="text-xs leading-5 text-surface-600">
              The build flow opens with this project, response package, prompt family, depth, and branch coordinates attached.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <CapacityDots label="Depth" value={depthValue} max={contract.maxDepth} />
              <CapacityDots label="Branch" value={branchValue} max={contract.maxWidth} />
            </div>
          </div>
        </section>
      </div>

      <div className="hidden lg:block">
        <div className="min-w-[900px] p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_84px_minmax(0,1fr)] items-start gap-0">
          <section className="relative border border-surface-200 bg-white p-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-500">
              Shared path collapses left
            </div>
            <div className="mt-2 text-sm font-black text-surface-900">
              {sharedSegments.length > 0 ? `${sharedSegments.length} earlier response${sharedSegments.length > 1 ? 's' : ''}` : 'No earlier shared steps'}
            </div>
            <div className="mt-3 grid gap-2">
              {sharedSegments.length > 0 ? sharedSegments.map((segment) => (
                <ForkSegmentChip key={segment.id} segment={segment} />
              )) : (
                <div className="border border-dashed border-surface-300 bg-surface-50 px-3 py-2 text-xs leading-5 text-surface-500">
                  Fork starts from the first response.
                </div>
              )}
            </div>
            {originalContinuationSegments.length > 0 && (
              <div className="mt-4 border-t border-surface-200 pt-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-400">
                  Original path after fork point
                </div>
                <div className="mt-2 grid gap-2">
                  {originalContinuationSegments.map((segment) => (
                    <ForkSegmentChip key={segment.id} segment={segment} />
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="relative h-full min-h-[220px]" aria-hidden="true">
            <div className="absolute left-1/2 top-8 h-[calc(100%-64px)] w-8 -translate-x-1/2 border-x-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_5px_0_0_rgba(255,255,255,0.24),inset_-5px_0_0_rgba(0,0,0,0.2)]" />
            <div className="absolute left-0 top-[92px] h-8 w-full border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.2),inset_0_-5px_0_rgba(0,0,0,0.16)]" />
            <div className="absolute left-1/2 top-[80px] h-14 w-14 -translate-x-1/2 border-4 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_8px_rgba(43,209,95,0.16)] motion-safe:animate-pulse" />
          </div>

          <section className="relative border-2 border-[#07551f] bg-white p-4 shadow-[0_18px_44px_rgba(7,85,31,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
                  <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
                  New fork lane
                </div>
                <div className="mt-2 text-lg font-black text-surface-900">
                  Branch starts from {forkLabel}
                </div>
              </div>
              <div className="border border-[#07551f] bg-[#effdf3] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#07551f]">
                Live handoff
              </div>
            </div>

            {forkPointSegment && (
              <div className="mt-4">
                <ForkSegmentChip segment={forkPointSegment} />
              </div>
            )}

            <div className="mt-4 grid gap-3 border border-dashed border-[#07551f] bg-[#effdf3] p-3">
              <div className="flex items-center gap-2 text-sm font-black text-surface-900">
                <ArrowRight className="h-4 w-4 text-[#07551f]" aria-hidden="true" />
                Your next prompt continues here
              </div>
              <p className="text-xs leading-5 text-surface-600">
                The build flow opens with this project, response package, prompt family, depth, and branch coordinates attached.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <CapacityDots label="Depth" value={depthValue} max={contract.maxDepth} />
                <CapacityDots label="Branch" value={branchValue} max={contract.maxWidth} />
              </div>
            </div>
          </section>
        </div>
        </div>
      </div>
    </div>
  )
}
