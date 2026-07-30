import Link from 'next/link'
import {
  AdminRequestQueue,
  RequestAdminServiceControls,
  type RequestQueueScope,
} from '@/components/requests/admin'
import {
  getRequestApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import {
  toAdminQueueModel,
} from '@/lib/build-requests/presentation'
import type { RequestCursor } from '@/lib/request-lifecycle'
import {
  updatePilotAdmissionAction,
  updateRequestControlsAction,
} from './actions'

export const dynamic = 'force-dynamic'

const SCOPES = new Set<RequestQueueScope>(['admin', 'triager', 'builder', 'reviewer'])

export default async function BuildRequestsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; cursor?: string }>
}) {
  const query = await searchParams
  const scope = SCOPES.has(query.scope as RequestQueueScope)
    ? query.scope as RequestQueueScope
    : 'admin'
  const service = await getRequestApplicationService()
  let loaded
  let loadError: unknown
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

        {scope === 'admin' ? (
          <RequestAdminServiceControls
            availability={loaded.availability}
            candidates={loaded.candidates.items}
            updateControls={updateRequestControlsAction}
            updateAdmission={updatePilotAdmissionAction}
          />
        ) : null}
        <AdminRequestQueue model={loaded.model} />
      </main>
  )
}
