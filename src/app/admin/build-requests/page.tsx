import Link from 'next/link'
import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { RequestCaseErrorFocus } from '@/components/requests/case/RequestCaseErrorFocus'
import {
  AdminRequestQueue,
  RequestAdminServiceControls,
  RequestPublicOperations,
  type RequestQueueScope,
} from '@/components/requests/admin'
import {
  getRequestApplicationService,
  getRequestPublicApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import {
  toAdminQueueModel,
} from '@/lib/build-requests/presentation'
import type { RequestCursor } from '@/lib/request-lifecycle'
import {
  updatePilotAdmissionAction,
  updateRequestOperatorAction,
  updateRequestPublicControlsAction,
  updateRequestReadinessAction,
  updateRequestReportAction,
} from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Build request operations | PathForge',
  robots: { index: false, follow: false },
}

const SCOPES = new Set<RequestQueueScope>(['admin', 'triager', 'builder', 'reviewer'])
const PUBLICATION_STATUSES = new Set([
  'active',
  'consent_pending',
  'fully_consented',
  'in_airlock',
  'published',
] as const)

export default async function BuildRequestsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string
    cursor?: string
    actionError?: string
    operatorQuery?: string
    publicationStatus?: string
  }>
}) {
  const query = await searchParams
  const scope = SCOPES.has(query.scope as RequestQueueScope)
    ? query.scope as RequestQueueScope
    : 'admin'
  const publicationStatus = PUBLICATION_STATUSES.has(
    query.publicationStatus as 'active',
  )
    ? query.publicationStatus as
      | 'active'
      | 'consent_pending'
      | 'fully_consented'
      | 'in_airlock'
      | 'published'
    : 'active'
  const operatorQuery =
    typeof query.operatorQuery === 'string' &&
      query.operatorQuery.length <= 80
      ? query.operatorQuery
      : ''
  const service = await getRequestApplicationService()
  const publicService = await getRequestPublicApplicationService()
  let loaded
  let publicLoaded
  let loadError: unknown
  let publicLoadError: unknown
  try {
    const [availability, queue] = await Promise.all([
      service.getAvailability(),
      service.listAssignedQueue({
        scope,
        cursor: query.cursor as RequestCursor | undefined,
        limit: 25,
      }),
    ])
    const candidates = scope === 'admin'
      ? await service.listPilotAdmissionCandidates({ limit: 50 })
      : { items: [], nextCursor: null }
    loaded = {
      availability,
      candidates,
      model: toAdminQueueModel({
      scope,
      availability,
      items: queue.items,
      nextCursor: queue.nextCursor,
      }),
    }
  } catch (error) {
    loadError = error
  }
  if (loaded && scope === 'admin') {
    try {
      const [operations, operators, reports, publications] = await Promise.all([
        publicService.getOperations(),
        publicService.listOperators({
          query: operatorQuery,
          limit: 100,
        }),
        publicService.listReports({ scope: 'admin', limit: 50 }),
        publicService.listPublicationQueue({
          status: publicationStatus,
          limit: 100,
        }),
      ])
      publicLoaded = {
        operations,
        operators: operators.items,
        reports,
        publications,
      }
    } catch (error) {
      publicLoadError = error
    }
  }
  if (!loaded) {
    const code = requestAuthorityErrorCode(loadError)
    return <main>
      <header className="max-w-3xl">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-surface-900">
          Private managed-service queue
        </h1>
      </header>
      <AdminRequestQueue
        model={{
          state: 'unavailable',
          scope,
          message: code === 'not_found'
            ? 'This operator scope is not available to the current account.'
            : 'The authority could not verify the queue. No empty-state conclusion was made.',
          retryHref: `/admin/build-requests?scope=${scope}`,
        }}
      />
    </main>
  }
  return (
    <main className="space-y-8">
        <header className="max-w-3xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-brand-orange-ink">
            Request a Build operations
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-surface-900">
            Private managed-service queue
          </h1>
          <p className="mt-3 text-sm leading-6 text-surface-600">
            Capacity, pilot admission, triage, assignment, and review remain
            authority-controlled. No action here publishes a case.
          </p>
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Request queue scopes">
            {[...SCOPES].map((item) => (
              <Link
                key={item}
                href={`/admin/build-requests?scope=${item}`}
                aria-current={scope === item ? 'page' : undefined}
                className="inline-flex min-h-11 items-center border border-surface-300 bg-white px-4 py-2 text-sm font-bold text-surface-800"
              >
                {item}
              </Link>
            ))}
          </nav>
        </header>
        {query.actionError ? (
          <>
            <RequestCaseErrorFocus focusKey={`admin-queue:${query.actionError}`} />
            <section
              role="alert"
              tabIndex={-1}
              data-request-case-error-summary
              className="max-w-3xl border border-red-300 bg-red-50 p-5 text-surface-900"
            >
              <h2 className="text-lg font-black">
                {query.actionError === 'stale_version'
                  ? 'The operator state changed before this action was recorded.'
                  : query.actionError === 'rate_limited'
                    ? 'This operator action is temporarily limited.'
                    : 'The authority could not verify this operator action.'}
              </h2>
              <p className="mt-2 text-sm">
                No success is claimed. The controls and candidates below come from a fresh authority read.
              </p>
            </section>
          </>
        ) : null}

        {scope === 'admin' ? (
          <>
            {publicLoaded ? (
              <RequestPublicOperations
                operations={publicLoaded.operations}
                operators={publicLoaded.operators}
                reports={publicLoaded.reports}
                publications={publicLoaded.publications}
                operatorQuery={operatorQuery}
                publicationStatus={publicationStatus}
                mutationNonce={randomUUID()}
                updateControls={updateRequestPublicControlsAction}
                updateOperator={updateRequestOperatorAction}
                updateReadiness={updateRequestReadinessAction}
                updateReport={updateRequestReportAction}
              />
            ) : (
              <section
                role="status"
                className="max-w-3xl border border-surface-300 bg-surface-50 p-5 text-surface-900"
                data-request-public-operations-unavailable
              >
                <h2 className="text-lg font-black">
                  Public-ready controls unavailable
                </h2>
                <p className="mt-2 text-sm text-surface-600">
                  The authority could not verify release gates, reports,
                  operators, or publication proposals. No empty or enabled
                  state is inferred.
                </p>
                {requestAuthorityErrorCode(publicLoadError) ===
                'rate_limited' ? (
                  <p className="mt-2 text-xs text-surface-600">
                    This read is temporarily limited. Retry from the current
                    operator session.
                  </p>
                ) : null}
              </section>
            )}
            <RequestAdminServiceControls
              candidates={loaded.candidates.items}
              updateAdmission={updatePilotAdmissionAction}
            />
          </>
        ) : null}
        <AdminRequestQueue model={loaded.model} />
      </main>
  )
}
