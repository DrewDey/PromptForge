import Link from 'next/link'
import { notFound } from 'next/navigation'
import ResponseStepForkAffordance from '@/components/ResponseStepForkAffordance'
import {
  buildProjectResponseForkHref,
  reconcileProjectForkDisplayedResponseIdentity,
  type ProjectForkSourceStep,
} from '@/lib/project-forks'

const displayedStep: ProjectForkSourceStep = {
  id: 'qa-generic-fork-step-2',
  stepNumber: 2,
  promptTitle: 'Refine the generic result',
  promptText: 'Refine the generic result without inventing an artifact.',
  responseText: 'The exact generic response remains visible and forkable.',
  responsePackageId: 'qa-generic-fork-step-2',
}
const authoritativeStep: ProjectForkSourceStep = {
  ...displayedStep,
}

export default function GenericForkActionFixturePage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const exactResponse = reconcileProjectForkDisplayedResponseIdentity(
    displayedStep,
    authoritativeStep,
  )
  const forkHref = exactResponse
    ? buildProjectResponseForkHref({
        sourceProjectId: 'qa-generic-fork-project',
        sourceProjectTitle: 'QA Generic Fork Project',
        sourceStepId: exactResponse.sourceStepId,
        sourceStepNumber: exactResponse.sourceStepNumber,
        promptFamilyId: 'qa-generic-fork-project:qa-generic-fork-step-2',
        destination: '/build',
      })
    : null
  const mismatchedResponse = reconcileProjectForkDisplayedResponseIdentity(
    { ...displayedStep, responseText: 'Mismatched response bytes.' },
    authoritativeStep,
  )

  return (
    <main
      className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6"
      data-generic-fork-action-fixture
    >
      <section
        className="border border-surface-200 bg-white p-5"
        data-generic-fork-positive
      >
        <h1 className="text-2xl font-black text-surface-900">
          Generic exact-response fork action
        </h1>
        <div className="group/response-fork-node relative mt-5 xl:pr-10">
          <p className="text-sm text-surface-700">{displayedStep.responseText}</p>
          <ResponseStepForkAffordance
            forkHref={forkHref}
            forkLabel="Fork the exact generic response"
          />
        </div>
        {forkHref && (
          <Link
            href={forkHref}
            data-generic-project-fork-action
            className="mt-6 inline-flex min-h-11 items-center bg-brand-orange px-4 py-2 text-sm font-bold text-white"
          >
            Fork this path
          </Link>
        )}
      </section>

      <section
        className="border border-surface-200 bg-surface-50 p-5"
        data-generic-fork-negative
        data-generic-project-fork-eligibility="denied"
        data-generic-project-fork-reason="exact-response-unavailable"
      >
        <h2 className="font-bold text-surface-900">Mismatched response</h2>
        <ResponseStepForkAffordance
          forkHref={mismatchedResponse ? forkHref : null}
          forkLabel="This action must remain unavailable"
        />
      </section>
    </main>
  )
}
