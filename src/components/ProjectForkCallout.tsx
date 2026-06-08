import Link from 'next/link'
import { ArrowRight, GitFork } from 'lucide-react'
import {
  buildProjectForkHref,
  createProjectForkDraftContract,
  PROJECT_FORK_MAX_DEPTH,
  PROJECT_FORK_MAX_WIDTH,
  type ProjectForkSourceStep,
} from '@/lib/project-forks'
import ProjectForkLineageScaffold from './ProjectForkLineageScaffold'

export default function ProjectForkCallout({
  projectId,
  projectTitle,
  sourceSteps = [],
  sourceStepId,
  sourceStepNumber,
  parentForkId,
  depth = 0,
  branchIndex = 0,
  promptFamilyId,
}: {
  projectId: string
  projectTitle?: string
  sourceSteps?: ProjectForkSourceStep[]
  sourceStepId?: string
  sourceStepNumber?: number
  parentForkId?: string
  depth?: number
  branchIndex?: number
  promptFamilyId?: string
}) {
  const source = {
    sourceProjectId: projectId,
    sourceProjectTitle: projectTitle,
    sourceStepId,
    sourceStepNumber,
    parentForkId,
    depth,
    branchIndex,
    promptFamilyId,
  }
  const contract = sourceSteps.length > 0
    ? createProjectForkDraftContract({ source, sourceSteps })
    : null
  const forkPointStep = contract?.forkPointStep
  const canForkDeeper = depth < PROJECT_FORK_MAX_DEPTH
  const canForkWider = branchIndex < PROJECT_FORK_MAX_WIDTH
  const forkHref = canForkDeeper && canForkWider
    ? buildProjectForkHref({
        ...source,
        sourceStepId: sourceStepId ?? forkPointStep?.id,
        sourceStepNumber: sourceStepNumber ?? forkPointStep?.stepNumber,
        promptFamilyId: promptFamilyId ?? contract?.promptFamilyId,
      })
    : null
  const terminalLabel = !canForkDeeper
    ? 'Max fork depth reached'
    : !canForkWider
      ? 'Max branch width reached'
      : null
  const terminalBody = !canForkDeeper
    ? `This branch is already at ${PROJECT_FORK_MAX_DEPTH} linked fork levels.`
    : !canForkWider
      ? `This response already has ${PROJECT_FORK_MAX_WIDTH} approved fork branches.`
      : null

  return (
    <div className="mb-10 border border-surface-200 bg-white">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-surface-500">
            <GitFork className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
            Fork this path
          </div>
          <h2 className="mt-2 text-2xl font-black text-surface-900">Build your own version.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-600">
            Use this project as the starting point for a new draft. Swap in your own prompt, source run, or
            refinement, then publish the version that actually works.
          </p>
          {forkPointStep && (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-surface-500">
              Default fork point: response package {String(forkPointStep.stepNumber).padStart(2, '0')}
            </p>
          )}
        </div>

        <div className="border-t border-surface-200 bg-primary-50 p-5 text-surface-900 lg:border-l lg:border-t-0">
          {forkHref ? (
            <>
              <Link
                href={forkHref}
                className="inline-flex w-full items-center justify-center gap-2 bg-brand-orange px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                <GitFork className="h-4 w-4" aria-hidden="true" />
                Fork this path
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="mt-3 text-xs leading-5 text-surface-600">
                Opens the build flow with this project attached as the fork source.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 border border-surface-300 bg-white px-4 py-3 text-sm font-semibold text-surface-500"
              >
                <GitFork className="h-4 w-4" aria-hidden="true" />
                {terminalLabel}
              </button>
              <p className="mt-3 text-xs leading-5 text-surface-600">
                {terminalBody}
              </p>
            </>
          )}
        </div>
      </div>
      {contract && (
        <ProjectForkLineageScaffold
          source={{
            ...source,
            sourceStepId: sourceStepId ?? forkPointStep?.id,
            sourceStepNumber: sourceStepNumber ?? forkPointStep?.stepNumber,
            promptFamilyId: promptFamilyId ?? contract.promptFamilyId,
          }}
          sourceSteps={sourceSteps}
        />
      )}
    </div>
  )
}
