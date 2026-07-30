import { notFound } from 'next/navigation'
import {
  AdminRequestDetailOperations,
  AdminRequestQueue,
  type RequestAdminActions,
  type RequestQueueScope,
} from '@/components/requests/admin'
import {
  RequestCaseShell,
  type RequestActorRole,
  type RequestCloseReason,
  type RequestLifecycle,
  type RequestModeration,
} from '@/components/requests/case'
import { RequestIntakeForm } from '@/components/requests/intake'
import { MyForgeRequestsList } from '@/components/requests/my-forge/MyForgeRequestsList'
import {
  RequestServiceOverview,
  RequestSubmissionReceipt,
} from '@/components/requests/service'
import {
  REQUEST_ACTOR_ROLES,
  REQUEST_ADMIN_DETAIL_STATES,
  REQUEST_ADMIN_QUEUE_STATES,
  REQUEST_ADMIN_SCOPES,
  REQUEST_CASE_ERROR_STATES,
  REQUEST_CLOSE_REASONS,
  REQUEST_DELIVERY_STATES,
  REQUEST_FIXTURE_ID,
  REQUEST_FIXTURE_TIME,
  REQUEST_INTAKE_STATES,
  REQUEST_LIFECYCLES,
  REQUEST_MODERATION_STATES,
  REQUEST_MY_FORGE_STATES,
  REQUEST_RECEIPT_STATES,
  REQUEST_SERVICE_STATES,
  adminDetailFixture,
  adminQueueFixture,
  caseFixture,
  intakeFixture,
  myForgeFixture,
  serviceAvailabilityFixture,
  type RequestAdminDetailFixtureState,
  type RequestAdminQueueFixtureState,
  type RequestCaseErrorFixtureState,
  type RequestDeliveryFixtureState,
  type RequestIntakeFixtureState,
  type RequestMyForgeFixtureState,
  type RequestServiceFixtureState,
} from '@/lib/build-requests/fixtures'

export const metadata = {
  robots: { index: false, follow: false },
}

type FixtureSurface =
  | 'service'
  | 'intake'
  | 'receipt'
  | 'case'
  | 'my-forge'
  | 'admin-queue'
  | 'admin-detail'

type SearchParams = Record<string, string | string[] | undefined>

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function oneOf<const Values extends readonly string[]>(
  value: string | undefined,
  values: Values,
  fallback: Values[number],
): Values[number] {
  return value && values.includes(value) ? value as Values[number] : fallback
}

async function fixtureAction(_formData: FormData) {
  'use server'
  void _formData
}

function FixtureFrame({
  surface,
  state,
  children,
}: {
  surface: FixtureSurface
  state: string
  children: React.ReactNode
}) {
  return (
    <main
      className="min-w-0 px-4 py-8 sm:px-6 lg:px-8"
      data-request-build-fixture
      data-fixture-surface={surface}
      data-fixture-state={state}
    >
      <div
        className="mx-auto mb-6 max-w-[1180px] border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950"
        role="note"
        data-fixture-proof-label
      >
        <strong>Local deterministic fixture proof.</strong>{' '}
        This route mounts production Request components but does not prove live
        service authority, database state, artifact custody, hash verification,
        deployment, or publication.
      </div>
      {children}
    </main>
  )
}

function DeliveryPlaceholder({ state }: { state: RequestDeliveryFixtureState }) {
  const copy: Record<RequestDeliveryFixtureState, { title: string; body: string }> = {
    not_ready: {
      title: 'Delivery is not ready.',
      body: 'No custody projection is available at this lifecycle stage.',
    },
    missing: {
      title: 'Delivery projection missing.',
      body: 'The shell fails closed because PM 3 supplied no participant-safe delivery projection.',
    },
    hash_mismatch: {
      title: 'Delivery verification blocked.',
      body: 'The fixture represents a hash-mismatch state without supplying bytes, a hash, or uploaded evidence.',
    },
    repair: {
      title: 'Repair is required.',
      body: 'Independent review returned the exact revision for repair. No artifact evidence is synthesized here.',
    },
    ready: {
      title: 'Delivery-ready shell slot.',
      body: 'PM 3 must replace this placeholder with the real protected custody and exact-review component.',
    },
    delivered: {
      title: 'Delivered lifecycle shell slot.',
      body: 'This fixture proves presentation only; it does not prove a download, artifact bytes, or custody receipt.',
    },
  }
  return (
    <div
      className="min-w-0 border border-dashed border-surface-400 bg-surface-50 p-4"
      data-request-delivery-placeholder
      data-delivery-state={state}
      role={state === 'missing' || state === 'hash_mismatch' ? 'alert' : 'status'}
    >
      <strong>{copy[state].title}</strong>
      <p className="mt-1 overflow-wrap-anywhere text-sm leading-6">{copy[state].body}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-surface-600">
        Placeholder · not custody or hash evidence
      </p>
    </div>
  )
}

export default async function RequestBuildFixturePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const query = await searchParams
  const surface = oneOf(
    firstValue(query.surface),
    ['service', 'intake', 'receipt', 'case', 'my-forge', 'admin-queue', 'admin-detail'] as const,
    'service',
  )

  if (surface === 'service') {
    const state = oneOf(
      firstValue(query.state),
      REQUEST_SERVICE_STATES,
      'available',
    ) as RequestServiceFixtureState
    return (
      <FixtureFrame surface={surface} state={state}>
        <RequestServiceOverview
          availability={serviceAvailabilityFixture(state)}
          isSignedIn
          intakeHref="/qa/request-build?surface=intake&state=pristine"
          searchHref="/paths"
        />
      </FixtureFrame>
    )
  }

  if (surface === 'intake') {
    const state = oneOf(
      firstValue(query.state),
      REQUEST_INTAKE_STATES,
      'pristine',
    ) as RequestIntakeFixtureState
    const fixture = intakeFixture(state)
    return (
      <FixtureFrame surface={surface} state={state}>
        <RequestIntakeForm
          action={fixtureAction}
          defaultValues={fixture.defaultValues}
          errors={fixture.errors}
          pending={fixture.pending}
          serviceError={fixture.serviceError}
          backHref="/qa/request-build?surface=service&state=available"
        />
      </FixtureFrame>
    )
  }

  if (surface === 'receipt') {
    const state = oneOf(
      firstValue(query.state),
      REQUEST_RECEIPT_STATES,
      'recorded',
    )
    return (
      <FixtureFrame surface={surface} state={state}>
        <RequestSubmissionReceipt
          receipt={{
            requestId: REQUEST_FIXTURE_ID,
            version: 1,
            eventId: 'event-10000000-0000-4000-8000-request-build-fixture',
            occurredAt: REQUEST_FIXTURE_TIME,
            lifecycle: 'submitted',
            moderation: 'clear',
            publication: 'private',
            replayed: state === 'replayed',
          }}
          requestHref="/qa/request-build?surface=case&lifecycle=submitted"
        />
      </FixtureFrame>
    )
  }

  if (surface === 'case') {
    const lifecycle = oneOf(
      firstValue(query.lifecycle),
      REQUEST_LIFECYCLES,
      'clarification_requested',
    ) as RequestLifecycle
    const actorRole = oneOf(
      firstValue(query.actor),
      REQUEST_ACTOR_ROLES,
      'requester',
    ) as RequestActorRole
    const moderation = oneOf(
      firstValue(query.moderation),
      REQUEST_MODERATION_STATES,
      'clear',
    ) as RequestModeration
    const closeReason = lifecycle === 'closed'
      ? oneOf(
          firstValue(query.closeReason),
          REQUEST_CLOSE_REASONS,
          'declined',
        ) as RequestCloseReason
      : null
    const errorState = oneOf(
      firstValue(query.error),
      REQUEST_CASE_ERROR_STATES,
      'none',
    ) as RequestCaseErrorFixtureState
    const deliveryState = oneOf(
      firstValue(query.delivery),
      REQUEST_DELIVERY_STATES,
      lifecycle === 'repair_required'
        ? 'repair'
        : lifecycle === 'delivery_ready'
          ? 'ready'
          : lifecycle === 'delivered' || lifecycle === 'completed'
            ? 'delivered'
            : 'not_ready',
    ) as RequestDeliveryFixtureState
    const model = caseFixture({
      lifecycle,
      actorRole,
      moderation,
      closeReason,
      errorState,
    })
    const state = [
      lifecycle,
      actorRole,
      moderation,
      closeReason ?? 'open',
      errorState,
      deliveryState,
    ].join(':')
    return (
      <FixtureFrame surface={surface} state={state}>
        <RequestCaseShell
          model={model}
          deliverySlot={<DeliveryPlaceholder state={deliveryState} />}
          primaryAction={
            model.capabilities.length > 0
              ? (
                  <form action={fixtureAction}>
                    <button
                      className="min-h-11 w-full bg-surface-900 px-4 py-3 font-bold text-white"
                      type="submit"
                    >
                      {model.nextAction.title}
                    </button>
                  </form>
                )
              : undefined
          }
        />
      </FixtureFrame>
    )
  }

  if (surface === 'my-forge') {
    const state = oneOf(
      firstValue(query.state),
      REQUEST_MY_FORGE_STATES,
      'ready',
    ) as RequestMyForgeFixtureState
    return (
      <FixtureFrame surface={surface} state={state}>
        <div className="mx-auto max-w-[1180px]">
          <MyForgeRequestsList state={myForgeFixture(state)} />
        </div>
      </FixtureFrame>
    )
  }

  if (surface === 'admin-queue') {
    const state = oneOf(
      firstValue(query.state),
      REQUEST_ADMIN_QUEUE_STATES,
      'open',
    ) as RequestAdminQueueFixtureState
    const scope = oneOf(
      firstValue(query.scope),
      REQUEST_ADMIN_SCOPES,
      'admin',
    ) as RequestQueueScope
    return (
      <FixtureFrame surface={surface} state={`${state}:${scope}`}>
        <div className="mx-auto max-w-[1180px]">
          <AdminRequestQueue model={adminQueueFixture(state, scope)} />
        </div>
      </FixtureFrame>
    )
  }

  const state = oneOf(
    firstValue(query.state),
    REQUEST_ADMIN_DETAIL_STATES,
    'triager',
  ) as RequestAdminDetailFixtureState
  const actions: RequestAdminActions = {
    resolveExistingPath: fixtureAction,
    requestClarification: fixtureAction,
    acceptAndAssign: fixtureAction,
    startBuild: fixtureAction,
    assignReviewer: fixtureAction,
    moderate: fixtureAction,
    close: fixtureAction,
  }
  return (
    <FixtureFrame surface={surface} state={state}>
      <div className="mx-auto max-w-[1180px]">
        <AdminRequestDetailOperations
          model={adminDetailFixture(state)}
          actions={actions}
        />
      </div>
    </FixtureFrame>
  )
}
