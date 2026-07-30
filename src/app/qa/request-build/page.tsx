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
import { AssignedRequestWorkUnavailable } from '@/components/requests/my-forge/AssignedRequestWorkUnavailable'
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
  serviceIntakeEligibilityFixture,
  type RequestAdminDetailFixtureState,
  type RequestAdminQueueFixtureState,
  type RequestCaseErrorFixtureState,
  type RequestDeliveryFixtureState,
  type RequestIntakeFixtureState,
  type RequestMyForgeFixtureState,
  type RequestServiceFixtureState,
} from '@/lib/build-requests/fixtures'
import { RequestAnalyticsTransitionFixture } from '@/components/requests/RequestAnalyticsTransitionFixture'
import {
  RequestCaseDeliverySlot,
  type RequestDeliveryReceiptActionState,
  type RequestDeliverySlotModel,
} from '@/components/requests/delivery'

export const metadata = {
  robots: { index: false, follow: false },
}

type FixtureSurface =
  | 'service'
  | 'intake'
  | 'receipt'
  | 'case'
  | 'my-forge'
  | 'my-forge-assigned'
  | 'admin-queue'
  | 'admin-detail'
  | 'analytics-transition'

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

async function fixtureReceiptAction(
  previous: RequestDeliveryReceiptActionState,
  _formData: FormData,
): Promise<RequestDeliveryReceiptActionState> {
  'use server'
  void _formData
  return { ...previous, error: 'unavailable' }
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

function deliveryFixture(
  state: RequestDeliveryFixtureState,
  lifecycle: RequestLifecycle,
  actorRole: RequestActorRole,
): RequestDeliverySlotModel {
  const acceptanceChecks = [{
    id: '10000000-0000-4000-8000-000000000011',
    label: 'The offline checklist remains usable after a reload.',
  }]
  const artifactState = state === 'hash_mismatch'
    ? 'failed'
    : state === 'missing'
      ? 'pending'
      : 'verified'
  const hasRevision = ['missing', 'hash_mismatch', 'repair', 'ready', 'delivered'].includes(state)
  const available = state === 'delivered'
  const builderWaiting = (
    state === 'sealed_waiting'
    && actorRole === 'builder'
    && lifecycle === 'building'
  )
  const builderStaging = (
    actorRole === 'builder'
    && lifecycle === 'building'
    && !builderWaiting
  )
  const artifacts = hasRevision || builderStaging || builderWaiting
    ? [{
        artifactId: '10000000-0000-4000-8000-000000000012',
        artifactOrdinal: 1,
        label: 'offline-checklist.html',
        mediaType: 'text/html' as const,
        mediaTypeLabel: 'Static HTML',
        byteLength: 48_000,
        integrityStatus: artifactState as 'pending' | 'verified' | 'failed',
        scanState: 'complete' as const,
        scanVerdict: 'clean' as const,
        findingCount: 0,
        reader: {
          canOpen: available,
          canDownload: available,
          openPath: available
            ? '/api/requests/deliveries/10000000-0000-4000-8000-000000000012/reader'
            : null,
          downloadPath: available
            ? '/api/requests/deliveries/10000000-0000-4000-8000-000000000012/reader?download=1'
            : null,
        },
      }]
    : []
  return {
    visibility: 'full',
    restrictedLabel: null,
    requestId: REQUEST_FIXTURE_ID,
    currentDeliveryRevisionId: hasRevision
      ? '10000000-0000-4000-8000-000000000013'
      : null,
    state: builderStaging
      ? 'staging'
      : state === 'sealed_waiting'
        ? 'pending'
      : state === 'not_ready'
        ? 'none'
        : state === 'repair'
          ? 'repair_required'
          : state === 'ready'
            ? 'reviewed'
            : state === 'delivered'
              ? 'available'
              : state,
    lifecycle,
    moderation: 'clear',
    publication: 'private',
    actorRoles: [actorRole],
    version: 7,
    revisionNumber: hasRevision ? 1 : null,
    revisionLabel: hasRevision ? 'Initial delivery' : null,
    summary: hasRevision ? 'A static offline checklist with reset confirmation.' : null,
    submittedAt: hasRevision ? REQUEST_FIXTURE_TIME : null,
    authoredByDisplayName: hasRevision ? 'Assigned builder' : null,
    authoredByDeidentified: false,
    artifactCount: hasRevision ? artifacts.length : null,
    totalBytes: hasRevision ? 48_000 : null,
    formatLabels: artifacts.length ? ['Static HTML'] : [],
    artifacts: hasRevision ? artifacts : [],
    acceptanceChecks,
    evidence: hasRevision
      ? [{
          acceptanceCheckId: acceptanceChecks[0].id,
          label: acceptanceChecks[0].label,
          result: 'pass',
          evidenceText: 'Reloaded the local page and completed the checklist offline.',
          evidenceRef: null,
        }]
      : [],
    evidenceChecklistVersion: hasRevision ? 1 : null,
    rightsSnapshotVersion: hasRevision ? 1 : null,
    rightsSummary: hasRevision
      ? 'The builder remains credited author. The requester receives non-exclusive use and download rights.'
      : null,
    review: {
      status: state === 'ready' || state === 'delivered' ? 'approved' : 'not_started',
      checklistVersion: hasRevision ? 1 : null,
      safetyIntegrityResult: state === 'ready' || state === 'delivered' ? 'pass' : null,
      verdict: state === 'ready' || state === 'delivered' ? 'approve' : null,
      reviewerDisplayName: state === 'ready' || state === 'delivered'
        ? 'Independent reviewer'
        : null,
      reviewerDeidentified: false,
      reason: null,
      reviewNotes: state === 'ready' || state === 'delivered'
        ? 'The exact revision passed the accepted check.'
        : null,
      repairInstructions: null,
      reviewedAt: state === 'ready' || state === 'delivered'
        ? REQUEST_FIXTURE_TIME
        : null,
      checks: [],
    },
    repairHistory: [],
    requesterOutcomes: [],
    integrityMessage: state === 'hash_mismatch'
      ? 'The protected object no longer matches its recorded bytes and cannot be served.'
      : state === 'missing'
        ? 'The recorded delivery object is unavailable.'
        : null,
    builderWorkspace: builderStaging || builderWaiting
      ? {
          deliveryRevisionId: '10000000-0000-4000-8000-000000000013',
          revisionState: builderWaiting ? 'sealed' : 'staging',
          revisionLabel: builderWaiting ? 'Initial delivery' : null,
          summary: builderWaiting ? 'A static offline checklist.' : null,
          evidence: builderWaiting
            ? [{
                acceptanceCheckId: acceptanceChecks[0].id,
                label: acceptanceChecks[0].label,
                result: 'pass',
                evidenceText: 'Verified offline after a reload.',
                evidenceRef: null,
              }]
            : [],
          artifacts,
          hasSealReceipt: builderWaiting,
        }
      : null,
    commands: {
      canStageArtifact: builderStaging,
      canAbandonArtifact: builderStaging,
      canPrepareRevision: builderStaging,
      canResumeRevision: false,
      submitKind: null,
      canReview: actorRole === 'reviewer' && lifecycle === 'review_pending',
      canRequestRepair: actorRole === 'reviewer' && lifecycle === 'review_pending',
      canAcknowledge: actorRole === 'requester' && lifecycle === 'delivery_ready',
      canRecordRequesterOutcome: actorRole === 'requester' && lifecycle === 'delivered',
    },
  }
}

export default async function RequestBuildFixturePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'
  ) notFound()

  const query = await searchParams
  const surface = oneOf(
    firstValue(query.surface),
    [
      'service',
      'intake',
      'receipt',
      'case',
      'my-forge',
      'my-forge-assigned',
      'admin-queue',
      'admin-detail',
      'analytics-transition',
    ] as const,
    'service',
  )

  if (surface === 'analytics-transition') {
    return (
      <FixtureFrame surface={surface} state="transition">
        <RequestAnalyticsTransitionFixture />
      </FixtureFrame>
    )
  }

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
          intakeEligibility={serviceIntakeEligibilityFixture(state)}
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
          idempotencyKey="fixture-intake-10000000-0000-4000-8000-000000000001"
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
            commandId: '40000000-0000-4000-8000-000000000001',
            requestId: REQUEST_FIXTURE_ID,
            version: 1,
            eventId: '50000000-0000-4000-8000-000000000001',
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
    const primaryCapabilityId = firstValue(query.primary) === 'mismatched'
      ? 'approve_delivery'
      : model.capabilities[0]?.id
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
          deliverySlot={moderation === 'clear' ? (
            <RequestCaseDeliverySlot
              model={deliveryFixture(deliveryState, lifecycle, actorRole)}
              mode={actorRole === 'requester' ? 'participant' : 'admin'}
              actions={{
                review: fixtureAction,
                requesterOutcome: fixtureReceiptAction,
                acknowledge: fixtureAction,
              }}
            />
          ) : null}
          primaryAction={
            primaryCapabilityId
              ? {
                  capabilityId: primaryCapabilityId,
                  content: (
                    <form action={fixtureAction}>
                      <button
                        className="min-h-11 w-full bg-surface-900 px-4 py-3 font-bold text-white"
                        type="submit"
                      >
                        {model.nextAction.title}
                      </button>
                    </form>
                  ),
                }
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

  if (surface === 'my-forge-assigned') {
    const state = oneOf(
      firstValue(query.state),
      ['empty', 'builder_rejected', 'reviewer_rejected', 'dual_ready'] as const,
      'empty',
    )
    const queueScopes: RequestQueueScope[] =
      state === 'builder_rejected'
        ? ['reviewer']
        : state === 'reviewer_rejected'
          ? ['builder']
          : state === 'dual_ready'
            ? ['builder', 'reviewer']
            : []
    return (
      <FixtureFrame surface={surface} state={state}>
        <div className="mx-auto max-w-[1180px]">
          <MyForgeRequestsList state={myForgeFixture('ready')} />
          {state === 'builder_rejected' || state === 'reviewer_rejected' ? (
            <AssignedRequestWorkUnavailable
              retryHref={`/qa/request-build?surface=my-forge-assigned&state=${state}`}
            />
          ) : null}
          {queueScopes.map((scope) => (
            <div className="mt-8" key={scope}>
              <AdminRequestQueue model={adminQueueFixture('open', scope)} />
            </div>
          ))}
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
    placeModerationHold: fixtureAction,
    releaseModerationHold: fixtureAction,
    removeForModeration: fixtureAction,
    close: fixtureAction,
    closeNoResponse: fixtureAction,
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
