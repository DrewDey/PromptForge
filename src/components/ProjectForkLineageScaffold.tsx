import { GitFork } from 'lucide-react'
import {
  createProjectForkDraftContract,
  type ProjectForkSource,
  type ProjectForkSourceStep,
} from '@/lib/project-forks'

function compactText(text: string, fallback: string) {
  const trimmed = text.trim()
  if (!trimmed) return fallback
  return trimmed.length > 72 ? `${trimmed.slice(0, 69)}...` : trimmed
}

function stepClasses(muted: boolean, isForkPoint: boolean) {
  if (muted) return 'border-surface-200 bg-surface-50 text-surface-400 opacity-65'
  if (isForkPoint) return 'border-[#07551f] bg-[#effdf3] text-surface-900 ring-2 ring-[#2bd15f]/35'
  return 'border-surface-300 bg-white text-surface-800'
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
  const forkLabel = forkPointStep
    ? `Response ${String(forkPointStep.stepNumber).padStart(2, '0')}`
    : 'Last response'

  return (
    <div className="overflow-x-auto border-t border-surface-200 bg-surface-50">
      <div className="grid min-w-[680px] gap-4 p-4 md:grid-cols-[minmax(0,1fr)_250px]">
        <ol className="relative space-y-2">
          {contract.lineageSegments.map((segment, index) => {
            const isForkPoint = segment.state === 'fork-point'
            const terminal = index === contract.lineageSegments.length - 1

            return (
              <li key={segment.id} className="relative pl-8">
                {!terminal && (
                  <span
                    className={[
                      'absolute left-[10px] top-10 h-[calc(100%+10px)] w-1',
                      segment.muted ? 'bg-surface-300' : 'bg-[#2bd15f]',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={[
                    'absolute left-0 top-4 h-5 w-5 border-2 bg-white',
                    isForkPoint ? 'border-[#07551f]' : segment.muted ? 'border-surface-300' : 'border-[#2bd15f]',
                  ].join(' ')}
                  aria-hidden="true"
                />
                {isForkPoint && (
                  <span
                    className="absolute left-full top-8 hidden h-2 w-10 border-y-2 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_2px_0_rgba(255,255,255,0.28)] md:block"
                    aria-hidden="true"
                  />
                )}
                <div className={['relative border px-3 py-2 transition', stepClasses(segment.muted, isForkPoint)].join(' ')}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
                      Prompt {String(segment.stepNumber).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                      {segment.muted ? 'Original' : isForkPoint ? 'Fork point' : 'Shared'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-bold">
                    {compactText(segment.promptTitle, `Prompt ${segment.stepNumber}`)}
                  </div>
                  <div className="mt-1 text-xs leading-5">
                    {compactText(segment.promptText, 'Prompt text captured')}
                  </div>
                  <div className="mt-2 border-t border-current/15 pt-2 font-mono text-[10px] uppercase tracking-[0.12em]">
                    Response package {String(segment.stepNumber).padStart(2, '0')}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <aside className="self-start border border-[#07551f] bg-white">
          <div className="flex items-center gap-2 border-b border-[#07551f] bg-[#effdf3] px-3 py-2 text-[#07551f]">
            <GitFork className="h-4 w-4" aria-hidden="true" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">Fork lane</span>
          </div>
          <div className="p-3">
            <div className="text-sm font-black text-surface-900">Starts from {forkLabel}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="border border-surface-200 px-2 py-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-500">Depth</div>
                <div className="mt-1 font-bold text-surface-900">
                  {contract.source.depth + 1} / {contract.maxDepth}
                </div>
              </div>
              <div className="border border-surface-200 px-2 py-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-500">Width</div>
                <div className="mt-1 font-bold text-surface-900">
                  {contract.source.branchIndex + 1} / {contract.maxWidth}
                </div>
              </div>
            </div>
            {contract.originalContinuationStepIds.length > 0 && (
              <p className="mt-3 text-xs leading-5 text-surface-500">
                {contract.originalContinuationStepIds.length} later original step
                {contract.originalContinuationStepIds.length > 1 ? 's' : ''} stay visible but muted.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
