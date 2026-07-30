import type {
  RequestActorRole,
  RequestCasePresentationModel,
  RequestRestrictedCasePresentationModel,
  RequestCloseReason,
  RequestLifecycle,
  RequestModeration,
} from '@/components/requests/case'
import type {
  RequestAdminDetailModel,
  RequestAvailability,
  RequestQueueModel,
  RequestQueueScope,
} from '@/components/requests/admin'
import type {
  MyForgeRequestLifecycle,
  MyForgeRequestsState,
} from '@/components/requests/my-forge/MyForgeRequestsList'
import type {
  RequestIntakeEligibility,
  RequestServiceAvailability,
} from '@/components/requests/service'
import type {
  RequestIntakeError,
  RequestIntakeFormProps,
  RequestIntakeValues,
} from '@/components/requests/intake'

export const REQUEST_FIXTURE_TIME = '2026-07-29T16:30:00.000Z'
export const REQUEST_FIXTURE_ID = '10000000-0000-4000-8000-000000000001'

export const REQUEST_LIFECYCLES = [
  'submitted',
  'triage',
  'clarification_requested',
  'accepted',
  'building',
  'review_pending',
  'repair_required',
  'delivery_ready',
  'delivered',
  'completed',
  'closed',
] as const satisfies readonly RequestLifecycle[]

export const REQUEST_ACTOR_ROLES = [
  'requester',
  'triager',
  'builder',
  'reviewer',
  'system',
] as const satisfies readonly RequestActorRole[]

export const REQUEST_MODERATION_STATES = [
  'clear',
  'held',
  'removed',
] as const satisfies readonly RequestModeration[]

export const REQUEST_CLOSE_REASONS = [
  'existing_resolution',
  'duplicate',
  'out_of_scope',
  'capacity_unavailable',
  'declined',
  'withdrawn',
  'expired',
  'failed_review',
  'safety_removed',
  'no_response',
] as const satisfies readonly RequestCloseReason[]

export const REQUEST_SERVICE_STATES = [
  'loading',
  'unavailable',
  'closed',
  'capacity_full',
  'available',
  'private',
  'sign_in_required',
  'not_admitted',
  'already_active',
  'controls_off',
] as const

export const REQUEST_INTAKE_STATES = [
  'pristine',
  'errors',
  'unavailable',
  'capacity_full',
  'not_admitted',
  'already_active',
  'expired_session',
  'hostile_error',
  'rate_limited',
  'duplicate',
  'stale_version',
  'forbidden_input',
  'pending',
  'project_reference',
  'response_reference',
] as const

export const REQUEST_RECEIPT_STATES = ['recorded', 'replayed'] as const

export const REQUEST_CASE_ERROR_STATES = [
  'none',
  'rate_limited',
  'stale_version',
  'idempotent_replay',
  'missing_delivery',
  'hash_mismatch',
  'publication_blocked',
] as const

export const REQUEST_DELIVERY_STATES = [
  'not_ready',
  'staging',
  'prepared_recovery',
  'sealed_waiting',
  'sealed_ready',
  'missing',
  'hash_mismatch',
  'repair',
  'ready',
  'delivered',
] as const

export const REQUEST_MY_FORGE_STATES = [
  'loading',
  'unavailable',
  'empty',
  'ready',
] as const

export const REQUEST_ADMIN_QUEUE_STATES = [
  'loading',
  'unavailable',
  'empty',
  'open',
  'controls_off',
  'assignment_off',
  'capacity_full',
] as const

export const REQUEST_ADMIN_SCOPES = [
  'admin',
  'triager',
  'builder',
  'reviewer',
] as const satisfies readonly RequestQueueScope[]

export const REQUEST_ADMIN_DETAIL_STATES = [
  'triager',
  'builder',
  'reviewer',
  'admin',
  'no_response_eligible',
  'none',
] as const

export type RequestServiceFixtureState = (typeof REQUEST_SERVICE_STATES)[number]
export type RequestIntakeFixtureState = (typeof REQUEST_INTAKE_STATES)[number]
export type RequestCaseErrorFixtureState = (typeof REQUEST_CASE_ERROR_STATES)[number]
export type RequestDeliveryFixtureState = (typeof REQUEST_DELIVERY_STATES)[number]
export type RequestMyForgeFixtureState = (typeof REQUEST_MY_FORGE_STATES)[number]
export type RequestAdminQueueFixtureState = (typeof REQUEST_ADMIN_QUEUE_STATES)[number]
export type RequestAdminDetailFixtureState = (typeof REQUEST_ADMIN_DETAIL_STATES)[number]

const BASE_INTAKE_VALUES: RequestIntakeValues = {
  title: 'Offline household outage checklist',
  outcome:
    'Create an offline checklist that a household can use to prepare for a short power outage.',
  intendedUser: 'A household member using a phone',
  mustWorkScenario:
    'The user loses connectivity and must still open, complete, and reset the saved checklist.',
  acceptanceChecks: [
    'The checklist works after the page is reopened offline.',
    'A completed item stays completed after a refresh.',
    'Reset asks for confirmation before clearing progress.',
  ],
  constraints:
    'Text-only intake. Support a 390px viewport and keyboard operation.',
}

export function serviceAvailabilityFixture(
  state: RequestServiceFixtureState,
): RequestServiceAvailability {
  switch (state) {
    case 'loading':
      return { status: 'loading' }
    case 'unavailable':
      return { status: 'unavailable', retryHref: '/qa/request-build?surface=service&state=available' }
    case 'closed':
      return { status: 'closed', activeCases: 1, maxActiveCases: 4 }
    case 'capacity_full':
      return { status: 'capacity_full', activeCases: 4, maxActiveCases: 4 }
    case 'private':
      return { status: 'private', activeCases: 2, maxActiveCases: 4 }
    case 'controls_off':
      return { status: 'closed', activeCases: 1, maxActiveCases: 4 }
    case 'sign_in_required':
    case 'not_admitted':
    case 'already_active':
    case 'available':
      return { status: 'available', activeCases: 2, maxActiveCases: 4 }
  }
}

export function serviceIntakeEligibilityFixture(
  state: RequestServiceFixtureState,
): RequestIntakeEligibility {
  if (state === 'sign_in_required') return 'sign_in_required'
  if (state === 'not_admitted') return 'not_admitted'
  if (state === 'already_active') return 'already_active'
  if (state === 'controls_off' || state === 'closed') return 'controls_off'
  return 'available'
}

export function intakeFixture(
  state: RequestIntakeFixtureState,
): Pick<
  RequestIntakeFormProps,
  'defaultValues' | 'errors' | 'pending' | 'serviceError'
> {
  const errors: RequestIntakeError[] = state === 'errors'
    ? [
        { field: 'outcome', message: 'State one finite outcome.' },
        { field: 'mustWorkScenario', message: 'Describe the must-work scenario.' },
        { field: 'acceptanceChecks', message: 'Add one to three testable checks.' },
        {
          field: 'pathforgeIdentifier',
          message: 'Use a server-validated PathForge identifier, not a URL.',
        },
      ]
    : []

  const serviceError =
    state === 'unavailable' ||
    state === 'capacity_full' ||
    state === 'not_admitted' ||
    state === 'already_active' ||
    state === 'rate_limited' ||
    state === 'duplicate' ||
    state === 'stale_version' ||
    state === 'forbidden_input'
      ? state
      : state === 'expired_session'
        ? 'auth_required'
        : state === 'hostile_error'
          ? 'unavailable'
      : null

  let defaultValues: Partial<RequestIntakeValues> = BASE_INTAKE_VALUES
  if (state === 'errors') {
    defaultValues = {
      title: '',
      outcome: '',
      intendedUser: 'Household member',
      mustWorkScenario: '',
      acceptanceChecks: [''],
      constraints: '',
    }
  } else if (state === 'project_reference') {
    defaultValues = {
      ...BASE_INTAKE_VALUES,
      pathforgeReference: {
        kind: 'project',
        projectId: '20000000-0000-4000-8000-000000000001',
      },
    }
  } else if (state === 'response_reference') {
    defaultValues = {
      ...BASE_INTAKE_VALUES,
      pathforgeReference: {
        kind: 'response',
        projectId: '20000000-0000-4000-8000-000000000001',
        modelVariantId: '30000000-0000-4000-8000-000000000001',
        responseStepNumber: 3,
      },
    }
  }

  return {
    defaultValues,
    errors,
    pending: state === 'pending',
    serviceError,
  }
}

function lifecycleNextAction(lifecycle: RequestLifecycle, actorRole: RequestActorRole) {
  if (lifecycle === 'clarification_requested' && actorRole === 'requester') {
    return {
      title: 'Answer one bounded clarification',
      description: 'The triager needs one detail before deciding whether this case is testable.',
    }
  }
  if (lifecycle === 'building' && actorRole === 'builder') {
    return {
      title: 'Continue the assigned build',
      description: 'Record progress only after the agreed acceptance checks remain intact.',
    }
  }
  if (lifecycle === 'review_pending' && actorRole === 'reviewer') {
    return {
      title: 'Review the exact delivery revision',
      description: 'Approve or require repair. The credited builder cannot review their own work.',
    }
  }
  if (lifecycle === 'delivery_ready' && actorRole === 'requester') {
    return {
      title: 'Open the private reviewed delivery',
      description: 'The custody component must verify the exact revision before presenting evidence.',
    }
  }
  if (lifecycle === 'closed' || lifecycle === 'completed') {
    return {
      title: 'No action required',
      description: 'This case remains available as a private durable record.',
    }
  }
  return {
    title: 'Wait for the next service update',
    description: `The current participant-safe projection is ${lifecycle.replaceAll('_', ' ')}.`,
  }
}

function caseErrorSummary(state: RequestCaseErrorFixtureState) {
  switch (state) {
    case 'none':
      return undefined
    case 'rate_limited':
      return {
        title: 'That action is temporarily limited.',
        messages: ['Wait before trying again. No duplicate command was recorded.'],
      }
    case 'stale_version':
      return {
        title: 'This case changed before the action completed.',
        messages: ['Refresh the durable case and retry against its current version.'],
      }
    case 'idempotent_replay':
      return {
        title: 'The original durable result was replayed.',
        messages: ['No duplicate lifecycle event or assignment was created.'],
      }
    case 'missing_delivery':
      return {
        title: 'Delivery is not available.',
        messages: ['The custody boundary did not supply a participant-safe delivery projection.'],
      }
    case 'hash_mismatch':
      return {
        title: 'Delivery verification did not match.',
        messages: ['The delivery stays blocked until the custody boundary verifies the exact revision.'],
      }
    case 'publication_blocked':
      return {
        title: 'Publication is not available.',
        messages: ['V1 keeps this case private and exposes no publication transition.'],
      }
  }
}

export function caseFixture(options: {
  lifecycle: RequestLifecycle
  actorRole: RequestActorRole
  moderation: RequestModeration
  closeReason: RequestCloseReason | null
  errorState: RequestCaseErrorFixtureState
}): RequestCasePresentationModel | RequestRestrictedCasePresentationModel {
  const { lifecycle, actorRole, moderation, closeReason, errorState } = options
  const builderAssigned = [
    'accepted',
    'building',
    'review_pending',
    'repair_required',
    'delivery_ready',
    'delivered',
    'completed',
  ].includes(lifecycle)
  const reviewerAssigned = [
    'review_pending',
    'repair_required',
    'delivery_ready',
    'delivered',
    'completed',
  ].includes(lifecycle)
  const capability = (() => {
    if (moderation === 'removed') return null
    if (moderation === 'held') {
      return actorRole === 'triager'
        ? { id: 'release_moderation_hold', label: 'Release moderation hold' }
        : null
    }
    if (actorRole === 'requester') {
      if (lifecycle === 'clarification_requested') {
        return { id: 'submit_clarification', label: 'Submit bounded clarification' }
      }
      if (['submitted', 'triage'].includes(lifecycle)) {
        return { id: 'withdraw', label: 'Withdraw private request' }
      }
      return null
    }
    if (actorRole === 'triager') {
      if (lifecycle === 'submitted') return { id: 'begin_triage', label: 'Begin triage' }
      if (lifecycle === 'triage') {
        return { id: 'request_clarification', label: 'Request bounded clarification' }
      }
      return null
    }
    if (actorRole === 'builder' && lifecycle === 'accepted') {
      return { id: 'start_build', label: 'Start assigned build' }
    }
    // PM 3 owns builder delivery, exact review, delivery open, and outcome actions.
    return null
  })()

  if (moderation !== 'clear') {
    return {
      visibility: moderation,
      requestLabel: moderation === 'removed'
        ? 'Request unavailable'
        : `Private case ${REQUEST_FIXTURE_ID}`,
      requestVersion: 17,
      lifecycle,
      moderation,
      publication: 'private',
      closeReason: lifecycle === 'closed' ? closeReason ?? 'declined' : null,
      actorRole,
      capabilities: capability ? [capability] : [],
      nextAction: lifecycleNextAction(lifecycle, actorRole),
      timeline: [{
        id: 'event-fixture-restricted',
        label: moderation === 'held' ? 'Case placed on hold' : 'Case removed',
        occurredAt: REQUEST_FIXTURE_TIME,
        actorLabel: 'Request application service',
      }],
      retentionNotice:
        'Only participant-safe status and retention information are available in this restricted fixture.',
    }
  }

  return {
    visibility: 'full',
    requestLabel: `Private case ${REQUEST_FIXTURE_ID}`,
    requestVersion: 17,
    lifecycle,
    moderation,
    publication: 'private',
    closeReason: lifecycle === 'closed' ? closeReason ?? 'declined' : null,
    actorRole,
    capabilities: [
      ...(capability ? [capability] : []),
      ...(
        actorRole === 'requester'
        && lifecycle === 'clarification_requested'
        ? [{ id: 'withdraw', label: 'Withdraw private request' }]
        : []
      ),
    ],
    nextAction: lifecycleNextAction(lifecycle, actorRole),
    brief: {
      outcome: BASE_INTAKE_VALUES.outcome,
      intendedUser: BASE_INTAKE_VALUES.intendedUser,
      mustWorkScenario: BASE_INTAKE_VALUES.mustWorkScenario,
      acceptanceChecks: [
        BASE_INTAKE_VALUES.acceptanceChecks[0],
        BASE_INTAKE_VALUES.acceptanceChecks[1],
        BASE_INTAKE_VALUES.acceptanceChecks[2],
      ],
      constraints:
        'Must work at exactly 390px without page overflow and remain keyboard operable with reduced motion.',
      pathforgeReference: {
        kind: 'project',
        projectId: '20000000-0000-4000-8000-000000000001',
        label: 'Offline checklist prepared project',
      },
    },
    clarification: lifecycle === 'clarification_requested'
      ? {
          state: 'requested',
          question: 'Should reset clear only completion state, or also custom checklist items?',
          answer: null,
          requestedAt: '2026-07-28T14:00:00.000Z',
        }
      : lifecycle === 'triage'
        ? {
            state: 'submitted',
            question: 'Must the checklist remain usable without connectivity?',
            answer: 'Yes. The requester confirmed the offline requirement.',
          }
        : { state: 'none' },
    closure: lifecycle === 'closed' && closeReason === 'existing_resolution'
      ? {
          note: 'Use the approved response that already satisfies the finish line.',
          resolutionHref: '/paths/offline-checklist#step-3',
          resolutionLabel: 'Open the PathForge project family at response step 3 (select the referenced variant shown below)',
          resolutionReference: {
            kind: 'response',
            projectId: '20000000-0000-4000-8000-000000000001',
            modelVariantId: '30000000-0000-4000-8000-000000000001',
            responseStepNumber: 3,
          },
        }
      : lifecycle === 'closed'
        ? {
            note: 'This case closed with a bounded participant-facing note.',
            resolutionHref: null,
            resolutionLabel: null,
            resolutionReference: null,
          }
        : undefined,
    assignments: [
      {
        role: 'triager',
        displayName: 'Tara Triager',
        status: 'Assigned',
      },
      ...(builderAssigned
        ? [{
            role: 'builder' as const,
            displayName: 'Blake Builder',
            status: lifecycle === 'building' ? 'Building' : 'Credited author',
            targetDate: '2026-08-15',
          }]
        : []),
      ...(reviewerAssigned
        ? [{
            role: 'reviewer' as const,
            displayName: 'Riley Reviewer',
            status: lifecycle === 'review_pending' ? 'Review pending' : 'Independent reviewer',
          }]
        : []),
    ],
    timeline: [
      {
        id: 'event-fixture-submitted',
        label: 'Private brief recorded',
        detail: 'Durable receipt version 1.',
        occurredAt: '2026-07-27T13:00:00.000Z',
        actorLabel: 'Requester',
      },
      {
        id: 'event-fixture-current',
        label: `Lifecycle projected as ${lifecycle.replaceAll('_', ' ')}`,
        occurredAt: REQUEST_FIXTURE_TIME,
        actorLabel: 'Request application service',
      },
    ],
    retentionNotice:
      'Participant-safe history is retained according to the private managed-service policy. This fixture does not prove database retention or artifact custody.',
    errorSummary: caseErrorSummary(errorState),
    statusMessage:
      errorState === 'idempotent_replay'
        ? 'Verified replay returned the existing durable receipt.'
        : undefined,
  }
}

export function myForgeFixture(state: RequestMyForgeFixtureState): MyForgeRequestsState {
  if (state === 'loading') return { kind: 'loading' }
  if (state === 'unavailable') {
    return {
      kind: 'unavailable',
      retryHref: '/qa/request-build?surface=my-forge&state=ready',
    }
  }
  if (state === 'empty') {
    return {
      kind: 'empty',
      newRequestHref: '/requests/new',
      existingPathHref: '/paths',
    }
  }
  return {
    kind: 'ready',
    requests: REQUEST_LIFECYCLES.map((lifecycle, index) => ({
      summaryLabel: `Fixture request ${index + 1}: ${lifecycle.replaceAll('_', ' ')}`,
      lifecycle: lifecycle satisfies MyForgeRequestLifecycle,
      moderation: lifecycle === 'closed' ? 'held' : 'clear',
      publication: 'private',
      statusLabel: lifecycle.replaceAll('_', ' '),
      unread: index % 2 === 0,
      nextAction:
        lifecycle === 'clarification_requested'
          ? 'Answer clarification'
          : lifecycle === 'delivery_ready'
            ? 'Open private delivery'
            : lifecycle === 'closed' || lifecycle === 'completed'
              ? 'No action required'
              : 'View durable case',
      updatedAt: new Date(Date.parse(REQUEST_FIXTURE_TIME) - index * 86_400_000).toISOString(),
      continuationHref: `/requests/${REQUEST_FIXTURE_ID}-${index}`,
    })),
    nextPageHref: '/my-forge?tab=requests&cursor=fixture-older',
  }
}

function adminAvailabilityFixture(
  state: Exclude<RequestAdminQueueFixtureState, 'loading' | 'unavailable' | 'empty'>,
): RequestAvailability {
  switch (state) {
    case 'open':
      return {
        state: 'open',
        activeCount: 2,
        maxActiveCases: 4,
        acceptingRequests: true,
        assignmentEnabled: true,
      }
    case 'controls_off':
      return {
        state: 'controls_off',
        activeCount: 0,
        maxActiveCases: 4,
        acceptingRequests: false,
        assignmentEnabled: false,
      }
    case 'assignment_off':
      return {
        state: 'assignment_off',
        activeCount: 2,
        maxActiveCases: 4,
        acceptingRequests: true,
        assignmentEnabled: false,
      }
    case 'capacity_full':
      return {
        state: 'capacity_full',
        activeCount: 4,
        maxActiveCases: 4,
        acceptingRequests: true,
        assignmentEnabled: true,
      }
  }
}

export function adminQueueFixture(
  state: RequestAdminQueueFixtureState,
  scope: RequestQueueScope,
): RequestQueueModel {
  if (state === 'loading') return { state: 'loading', scope }
  if (state === 'unavailable') {
    return {
      state: 'unavailable',
      scope,
      message: 'The fixture secure read failed; no empty queue was inferred.',
      retryHref: `/qa/request-build?surface=admin-queue&state=open&scope=${scope}`,
    }
  }
  const availability = state === 'empty'
    ? adminAvailabilityFixture('open')
    : adminAvailabilityFixture(state)
  return {
    state: 'ready',
    scope,
    availability,
    rows: state === 'empty'
      ? []
      : REQUEST_LIFECYCLES.slice(0, 4).map((lifecycle, index) => ({
          requestId: `10000000-0000-4000-8000-${String(index + 2).padStart(12, '0')}`,
          detailHref: `/admin/build-requests/10000000-0000-4000-8000-${String(index + 2).padStart(12, '0')}`,
          version: index + 3,
          label: `Participant-safe ${lifecycle.replaceAll('_', ' ')} fixture`,
          lifecycle,
          moderation: 'clear',
          actorRole: scope === 'admin' ? 'triager' : scope,
          nextAction: `Continue ${scope} workflow`,
          unread: index === 0,
          updatedAt: new Date(Date.parse(REQUEST_FIXTURE_TIME) - index * 3_600_000).toISOString(),
          targetDate: index > 1 ? '2026-08-05T17:00:00.000Z' : null,
        })),
    nextCursor: state === 'empty' ? null : 'fixture-next',
    loadMoreHref:
      state === 'empty'
        ? undefined
        : `/qa/request-build?surface=admin-queue&state=${state}&scope=${scope}&cursor=fixture-next`,
  }
}

export function adminDetailFixture(
  state: RequestAdminDetailFixtureState,
): RequestAdminDetailModel {
  const reviewer = state === 'reviewer'
  const builder = state === 'builder'
  const triager = state === 'triager'
  const admin = state === 'admin'
  const noResponseEligible = state === 'no_response_eligible'
  return {
    requestId: REQUEST_FIXTURE_ID,
    version: 9,
    actorRole: reviewer ? 'reviewer' : builder ? 'builder' : 'triager',
    lifecycle: noResponseEligible
      ? 'delivered'
      : reviewer
        ? 'review_pending'
        : builder
          ? 'building'
          : 'triage',
    moderation: 'clear',
    capabilities: {
      canBeginTriage: triager || admin,
      canResolveExistingPath: triager || admin,
      canRequestClarification: triager || admin,
      canAcceptAndAssign: triager || admin,
      canStartBuild: builder,
      canAssignReviewer: triager || admin,
      canPlaceModerationHold: admin,
      canReleaseModerationHold: false,
      canRemoveForModeration: admin,
      canReassignTriager: admin,
      canReassignBuilder: admin,
      canReassignReviewer: admin,
      canCloseNoResponse: noResponseEligible,
    },
    allowedCloseReasons: triager || admin
      ? ['out_of_scope', 'capacity_unavailable', 'declined']
      : [],
    eligibleBuilders: triager || admin
      ? [
          {
            accountId: '20000000-0000-4000-8000-000000000001',
            displayName: 'Blake Builder',
          },
          {
            accountId: '20000000-0000-4000-8000-000000000002',
            displayName: 'Morgan Maker',
          },
        ]
      : [],
    eligibleReviewers: triager || admin
      ? [
          {
            accountId: '30000000-0000-4000-8000-000000000001',
            displayName: 'Riley Reviewer',
          },
        ]
      : [],
    eligibleTriagers: admin
      ? [{
          accountId: '40000000-0000-4000-8000-000000000001',
          displayName: 'Taylor Triager',
        }]
      : [],
    builderLabel: 'Blake Builder',
    reviewerLabel: reviewer ? 'Riley Reviewer' : null,
    targetDate: '2026-08-15',
    idempotencyKeys: {
      existingResolution: 'fixture-existing-resolution-00000001',
      duplicate: 'fixture-duplicate-00000001',
      clarification: 'fixture-clarification-00000001',
      accept: 'fixture-accept-00000001',
      startBuild: 'fixture-start-build-00000001',
      assignReviewer: 'fixture-assign-reviewer-00000001',
      placeModerationHold: 'fixture-place-hold-00000001',
      releaseModerationHold: 'fixture-release-hold-00000001',
      removeForModeration: 'fixture-remove-moderation-00000001',
      close: 'fixture-close-00000001',
      beginTriage: 'fixture-begin-triage-00000001',
      reassignTriager: 'fixture-reassign-triager-00000001',
      reassignBuilder: 'fixture-reassign-builder-00000001',
      reassignReviewer: 'fixture-reassign-reviewer-00000001',
      closeNoResponse: 'fixture-close-no-response-00000001',
    },
    timeline: [
      {
        eventId: 'fixture-admin-event-1',
        label: 'Private brief recorded',
        detail: 'Fixture timeline event; not a transactional event.',
        actorLabel: 'Requester',
        occurredAt: '2026-07-27T13:00:00.000Z',
      },
      {
        eventId: 'fixture-admin-event-2',
        label: 'Triage started',
        actorLabel: 'Tara Triager',
        occurredAt: REQUEST_FIXTURE_TIME,
      },
    ],
  }
}
