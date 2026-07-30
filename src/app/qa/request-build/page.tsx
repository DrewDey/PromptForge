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
  const builderReady = (
    state === 'sealed_ready'
    && actorRole === 'builder'
    && lifecycle === 'building'
  )
  const builderStaging = (
    state === 'staging'
    && actorRole === 'builder'
    && lifecycle === 'building'
  )
  const builderPrepared = (
    state === 'prepared_recovery'
    && actorRole === 'builder'
    && lifecycle === 'building'
  )
  const artifacts = hasRevision || builderStaging || builderPrepared || builderWaiting || builderReady
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
    state: state === 'staging' || state === 'prepared_recovery'
      ? 'staging'
      : state === 'sealed_waiting'
        ? 'sealed_waiting'
      : state === 'sealed_ready'
        ? 'sealed_ready'
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
    builderWorkspace: builderStaging || builderPrepared || builderWaiting || builderReady
      ? {
          deliveryRevisionId: '10000000-0000-4000-8000-000000000013',
          revisionState: builderWaiting || builderReady
            ? 'sealed'
            : builderPrepared
              ? 'prepared'
              : 'staging',
          revisionLabel: builderWaiting || builderReady || builderPrepared
            ? 'Initial delivery'
            : null,
          summary: builderWaiting || builderReady || builderPrepared
            ? 'A static offline checklist.'
            : null,
          evidence: builderWaiting || builderReady || builderPrepared
            ? [{
                acceptanceCheckId: acceptanceChecks[0].id,
                label: acceptanceChecks[0].label,
                result: 'pass',
                evidenceText: 'Verified offline after a reload.',
                evidenceRef: null,
              }]
            : [],
          artifacts,
          hasSealReceipt: builderWaiting || builderReady,
        }
      : null,
    commands: {
      canStageArtifact: builderStaging,
      canAbandonArtifact: builderStaging,
      canPrepareRevision: builderStaging,
      canResumeRevision: builderReady || builderPrepared,
      submitKind: builderReady ? 'submit_delivery' : null,
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
    const baseModel = caseFixture({
      lifecycle,
      actorRole,
      moderation,
      closeReason,
      errorState,
    })
    const stateModel = (
      deliveryState === 'sealed_ready'
      && baseModel.visibility === 'full'
    )
      ? {
          ...baseModel,
          capabilities: [{
            id: 'submit_delivery',
            label: 'Submit sealed delivery for independent review',
          }],
          nextAction: {
            title: 'Submit the sealed revision',
            description:
              'An independent reviewer is assigned and the exact sealed revision is ready for submission.',
          },
          }
      : deliveryState === 'staging'
        && baseModel.visibility === 'full'
        ? {
            ...baseModel,
            capabilities: [{
              id: 'abandon_delivery_artifact',
              label: 'Remove a staged artifact',
            }],
            nextAction: {
              title: 'Continue the staged delivery',
              description:
                'The canonical staging workspace is ready to continue in the private delivery area.',
            },
          }
      : deliveryState === 'prepared_recovery'
        && baseModel.visibility === 'full'
        ? {
            ...baseModel,
            capabilities: [],
            nextAction: {
              title: 'Resume the prepared delivery',
              description:
                'The canonical prepared workspace can be recovered and sealed in the private delivery area.',
            },
          }
      : deliveryState === 'sealed_waiting'
        && baseModel.visibility === 'full'
        ? {
            ...baseModel,
            capabilities: [],
            nextAction: {
              title: 'Wait for an independent reviewer assignment',
              description:
                'The exact revision is sealed. No further builder action is available until an independent reviewer is assigned.',
            },
          }
      : baseModel
    const model = (
      moderation === 'held'
      && actorRole === 'triager'
      && stateModel.capabilities.some(capability => (
        capability.id === 'release_moderation_hold'
        || capability.id === 'remove_for_moderation'
      ))
    )
      ? {
          ...stateModel,
          nextAction: {
            title: 'Resolve the moderation hold',
            description:
              'Use only the restricted moderation operation authorized for this held case.',
          },
        }
      : stateModel
    const deliveryModel = deliveryFixture(deliveryState, lifecycle, actorRole)
    const deliveryWorkflowAvailable = deliveryModel.visibility === 'full' && (
      deliveryModel.commands.canStageArtifact
      || deliveryModel.commands.canAbandonArtifact
      || deliveryModel.commands.canPrepareRevision
      || deliveryModel.commands.canResumeRevision
      || deliveryModel.commands.submitKind !== null
      || deliveryModel.commands.canReview
      || deliveryModel.commands.canRequestRepair
      || deliveryModel.commands.canAcknowledge
      || deliveryModel.commands.canRecordRequesterOutcome
    )
    const primaryCapabilityId = (
      deliveryState === 'staging'
      || deliveryState === 'prepared_recovery'
      || deliveryState === 'sealed_waiting'
      || deliveryState === 'sealed_ready'
    )
      ? undefined
      : firstValue(query.primary) === 'mismatched'
        ? 'approve_delivery'
        : model.capabilities[0]?.id
    const hasSecondaryWithdrawal = (
      model.visibility === 'full'
      && model.capabilities.some(capability => capability.id === 'withdraw')
      && primaryCapabilityId !== 'withdraw'
    )
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
              model={deliveryModel}
              mode="participant"
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
                  content: moderation === 'held'
                    && primaryCapabilityId === 'release_moderation_hold'
                    ? (
                      <a href="#request-case-held-operation">
                        Resolve moderation hold
                      </a>
                    )
                    : (
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
          restrictedAction={
            moderation === 'held'
            && primaryCapabilityId === 'release_moderation_hold'
              ? (
                  <div className="space-y-6">
                    <form action={fixtureAction} className="space-y-3">
                      <input
                        type="hidden"
                        name="command"
                        value="release_moderation_hold"
                      />
                      <label className="block text-sm font-semibold">
                        Hold resolution
                        <textarea
                          name="resolution"
                          required
                          minLength={4}
                          maxLength={500}
                          rows={3}
                          className="mt-2 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-base"
                        />
                      </label>
                      <button className="min-h-11 w-full" type="submit">
                        Release moderation hold
                      </button>
                    </form>
                    <form action={fixtureAction} className="space-y-3">
                      <input
                        type="hidden"
                        name="command"
                        value="remove_for_moderation"
                      />
                      <label className="block text-sm font-semibold">
                        Removal reason
                        <textarea
                          name="reason"
                          required
                          minLength={4}
                          maxLength={500}
                          rows={3}
                          className="mt-2 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-base"
                        />
                      </label>
                      <button className="min-h-11 w-full" type="submit">
                        Remove case for moderation
                      </button>
                    </form>
                  </div>
                )
              : undefined
          }
          workflowNavigation={deliveryWorkflowAvailable ? (
            <a href="#request-delivery-workflow">
              Continue exact delivery workflow
            </a>
          ) : undefined}
          clarificationAction={
            lifecycle === 'clarification_requested' && actorRole === 'requester'
              ? (
                  <form action={fixtureAction}>
                    <label>
                      Clarification answer
                      <textarea name="answer" required minLength={4} maxLength={2000} />
                    </label>
                    <button className="min-h-11" type="submit">
                      Submit clarification
                    </button>
                  </form>
                )
              : undefined
          }
          secondaryAction={hasSecondaryWithdrawal ? (
            <form action={fixtureAction}>
              <input type="hidden" name="command" value="withdraw" />
              <label>
                Confirm permanent withdrawal
                <select name="confirmation" required defaultValue="">
                  <option value="" disabled>Choose confirmation</option>
                  <option value="confirmed">
                    I understand this permanently closes the private request.
                  </option>
                </select>
              </label>
              <button type="submit">Withdraw request</button>
            </form>
          ) : undefined}
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
