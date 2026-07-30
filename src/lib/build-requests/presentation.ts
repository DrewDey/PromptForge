import { getProjectHref } from '@/lib/project-links'
import type {
  PathForgeRequestReference,
  RequestActorContextV1,
  RequestAvailabilityV1,
  RequestCaseDetailResultV1,
  RequestCaseDetailV1,
  RequestCaseSummary,
  RequestLifecycleState,
  RequestQueueSummaryV1,
} from '@/lib/request-lifecycle'
import type {
  RequestAdminDetailModel,
  RequestAvailability,
  RequestEligibleAssignee,
  RequestQueueModel,
  RequestQueueScope,
} from '@/components/requests/admin'
import type {
  RequestCasePresentationModel,
  RequestRestrictedCasePresentationModel,
} from '@/components/requests/case'
import type {
  MyForgeRequestSummary,
  MyForgeRequestsState,
} from '@/components/requests/my-forge/MyForgeRequestsList'
import type {
  RequestIntakeEligibility,
  RequestServiceAvailability,
} from '@/components/requests/service'

const lifecycleLabel: Record<RequestLifecycleState, string> = {
  submitted: 'Submitted',
  triage: 'In triage',
  clarification_requested: 'Clarification requested',
  accepted: 'Accepted',
  building: 'Building',
  review_pending: 'Independent review',
  repair_required: 'Repair required',
  delivery_ready: 'Reviewed delivery ready',
  delivered: 'Delivery opened',
  completed: 'Completed',
  closed: 'Closed',
}

function participantActorRole(actor: RequestActorContextV1) {
  if (actor.roles.includes('requester')) return 'requester' as const
  if (actor.roles.includes('triager')) return 'triager' as const
  if (actor.roles.includes('builder')) return 'builder' as const
  if (actor.roles.includes('reviewer')) return 'reviewer' as const
  return 'system' as const
}

function operatorActorRole(actor: RequestActorContextV1) {
  if (actor.operatorAuthority === 'admin' || actor.roles.includes('triager')) {
    return 'triager' as const
  }
  if (actor.roles.includes('builder')) return 'builder' as const
  if (actor.roles.includes('reviewer')) return 'reviewer' as const
  if (actor.roles.includes('requester')) return 'requester' as const
  return 'system' as const
}

function retentionNotice(detail: RequestCaseDetailResultV1) {
  const notices = detail.notices.map((notice) => (
    notice.effectiveUntil
      ? `${notice.label} Effective until ${notice.effectiveUntil}.`
      : notice.label
  ))
  return notices.length > 0
    ? notices.join(' ')
    : 'Participant-visible history is retained according to the case authority and any active preservation hold.'
}

function timeline(detail: RequestCaseDetailResultV1) {
  return detail.events.items.map((event) => ({
    id: event.eventId,
    label: event.label,
    detail: event.reason ?? undefined,
    occurredAt: event.occurredAt,
    actorLabel: event.actor?.displayName ?? event.actorRole,
  }))
}

function referenceHref(reference: PathForgeRequestReference | null) {
  if (!reference) return null
  return getProjectHref({ id: reference.projectId })
}

export function toRequestServiceAvailability(
  availability: RequestAvailabilityV1,
): {
  availability: RequestServiceAvailability
  intakeEligibility: RequestIntakeEligibility
} {
  const capacity = {
    activeCases: availability.activeCaseCount,
    maxActiveCases: availability.activeCaseCapacity,
  }
  const mapped: RequestServiceAvailability = !availability.acceptingRequests
    ? { status: 'closed', ...capacity }
    : availability.remainingCapacity === 0
      ? { status: 'capacity_full', ...capacity }
      : { status: 'available', ...capacity }
  return {
    availability: mapped,
    intakeEligibility: availability.intakeEligibility,
  }
}

export function toUnavailableServiceAvailability(): RequestServiceAvailability {
  return { status: 'unavailable', retryHref: '/requests' }
}

export function toMyForgeRequest(summary: RequestCaseSummary): MyForgeRequestSummary {
  return {
    summaryLabel: summary.title,
    lifecycle: summary.lifecycleState,
    moderation: summary.moderationState,
    publication: 'private',
    statusLabel: lifecycleLabel[summary.lifecycleState],
    unread: summary.unread.unreadCount > 0,
    nextAction: summary.nextActions[0]?.label ?? 'No action is currently required',
    updatedAt: summary.updatedAt,
    continuationHref: `/requests/${encodeURIComponent(summary.requestId)}`,
  }
}

export function toMyForgeRequestsState(
  items: readonly RequestCaseSummary[],
  nextCursor: string | null,
): MyForgeRequestsState {
  if (items.length === 0) {
    return {
      kind: 'empty',
      newRequestHref: '/requests/new',
      existingPathHref: '/paths?panel=open',
    }
  }
  return {
    kind: 'ready',
    requests: items.map(toMyForgeRequest),
    nextPageHref: nextCursor
      ? `/my-forge?tab=requests&cursor=${encodeURIComponent(nextCursor)}`
      : undefined,
  }
}

export function toAdminAvailability(availability: RequestAvailabilityV1): RequestAvailability {
  const base = {
    activeCount: availability.activeCaseCount,
    maxActiveCases: availability.activeCaseCapacity,
    acceptingRequests: availability.acceptingRequests,
    assignmentEnabled: availability.assigningRequests,
  }
  if (!availability.acceptingRequests) {
    return { state: 'controls_off', ...base, acceptingRequests: false }
  }
  if (!availability.assigningRequests) {
    return { state: 'assignment_off', ...base, assignmentEnabled: false }
  }
  if (availability.remainingCapacity === 0) {
    return { state: 'capacity_full', ...base }
  }
  return {
    state: 'open',
    ...base,
    acceptingRequests: true,
    assignmentEnabled: true,
  }
}

export function toAdminQueueModel(input: {
  scope: RequestQueueScope
  availability: RequestAvailabilityV1
  items: readonly RequestQueueSummaryV1[]
  nextCursor: string | null
}): RequestQueueModel {
  return {
    state: 'ready',
    scope: input.scope,
    availability: toAdminAvailability(input.availability),
    rows: input.items.map((row) => ({
      requestId: row.requestId,
      detailHref: `/admin/build-requests/${encodeURIComponent(row.requestId)}`,
      version: row.requestVersion,
      label: row.title,
      lifecycle: row.lifecycleState,
      moderation: row.moderationState,
      actorRole: row.actorRole === 'admin' ? 'triager' : row.actorRole,
      nextAction: row.nextActions[0]?.label ?? 'No action required',
      unread: row.unread.unreadCount > 0,
      updatedAt: row.updatedAt,
      targetDate: row.targetDate,
    })),
    nextCursor: input.nextCursor,
    loadMoreHref: input.nextCursor
      ? `/admin/build-requests?scope=${input.scope}&cursor=${encodeURIComponent(input.nextCursor)}`
      : undefined,
  }
}

export function toRequestCasePresentation(
  detail: RequestCaseDetailResultV1,
): RequestCasePresentationModel | RequestRestrictedCasePresentationModel {
  const role = participantActorRole(detail.actor)
  const capabilities = detail.actor.capabilities
    .filter((capability) => capability !== 'view_case')
    .map((capability) => ({
      id: capability,
      label: detail.visibility === 'full'
        ? detail.nextActions.find((action) => action.kind === capability)?.label
          ?? capability.replaceAll('_', ' ')
        : capability.replaceAll('_', ' '),
    }))
  const nextAction = detail.visibility === 'full'
    ? detail.nextActions[0]
    : null
  const common = {
    requestLabel: detail.visibility === 'full' ? detail.title : detail.safeLabel,
    requestVersion: detail.requestVersion,
    lifecycle: detail.lifecycleState,
    moderation: detail.moderationState,
    publication: detail.publicationState,
    closeReason: detail.closeReason,
    actorRole: role,
    capabilities,
    nextAction: {
      title: nextAction?.label ?? 'No action is currently required',
      description: nextAction
        ? 'This action is projected by the current case authority and will be revalidated when submitted.'
        : 'The service has not authorized a case action for this participant and version.',
    },
    timeline: timeline(detail),
    retentionNotice: retentionNotice(detail),
  }
  if (detail.visibility !== 'full') {
    return {
      ...common,
      visibility: detail.visibility,
      moderation: detail.moderationState,
    }
  }
  const latestClarification = detail.clarifications.at(-1)
  const participantsByRole = new Map(
    detail.participants.map((participant) => [participant.role, participant]),
  )
  const assignments = [
    ...detail.participants
      .filter((participant) => participant.role === 'triager')
      .map((participant) => ({
        role: 'triager' as const,
        displayName: participant.displayName,
        status: 'Active accountable triager',
      })),
    ...detail.assignments.map((assignment) => ({
      role: assignment.role,
      displayName:
        participantsByRole.get(assignment.role)?.displayName
        ?? (assignment.role === 'builder' ? 'Assigned builder' : 'Assigned reviewer'),
      status: assignment.active ? 'Active' : 'Ended',
      targetDate:
        assignment.role === 'builder' && assignment.active
          ? detail.targetDate ?? undefined
          : undefined,
    })),
  ]
  const checks = detail.brief.acceptanceChecks.map((check) => check.text)
  const acceptanceChecks = checks.length === 1
    ? [checks[0]] as const
    : checks.length === 2
      ? [checks[0], checks[1]] as const
      : [checks[0], checks[1], checks[2]] as const
  const resolutionHref = referenceHref(detail.resolutionReference)
  return {
    visibility: 'full',
    ...common,
    brief: {
      outcome: detail.brief.outcome,
      intendedUser: detail.brief.intendedUser,
      mustWorkScenario: detail.brief.mustWorkScenario,
      acceptanceChecks,
      constraints: detail.brief.constraints || undefined,
      pathforgeReference: detail.brief.pathforgeReference ?? undefined,
    },
    clarification: latestClarification
      ? {
          state: latestClarification.answer === null ? 'requested' : 'submitted',
          summary: latestClarification.answer ?? latestClarification.question,
          requestedAt: latestClarification.requestedAt,
          respondedAt: latestClarification.answeredAt ?? undefined,
        }
      : { state: 'none' },
    assignments,
    closure: detail.closeReason
      ? {
          note: detail.closureNote,
          resolutionHref,
          resolutionLabel: detail.resolutionReference
            ? `PathForge ${detail.resolutionReference.kind} resolution`
            : null,
        }
      : undefined,
  }
}

function stableIntent(requestId: string, version: number, kind: string) {
  return `request-${requestId}-v${version}-${kind}`
}

export function toAdminDetailModel(input: {
  detail: RequestCaseDetailV1
  eligibleBuilders?: readonly RequestEligibleAssignee[]
  eligibleReviewers?: readonly RequestEligibleAssignee[]
  eligibleTriagers?: readonly RequestEligibleAssignee[]
}): RequestAdminDetailModel {
  const { detail } = input
  const capabilities = new Set(detail.actor.capabilities)
  const participant = (role: 'builder' | 'reviewer') => (
    detail.participants.find((item) => item.role === role)?.displayName
  )
  return {
    requestId: detail.requestId,
    version: detail.requestVersion,
    actorRole: operatorActorRole(detail.actor),
    lifecycle: detail.lifecycleState,
    moderation: detail.moderationState,
    capabilities: {
      canBeginTriage: capabilities.has('begin_triage'),
      canResolveExistingPath:
        capabilities.has('close') &&
        detail.actor.allowedCloseReasons.some((reason) => (
          reason === 'existing_resolution' || reason === 'duplicate'
        )),
      canRequestClarification: capabilities.has('request_clarification'),
      canAcceptAndAssign: capabilities.has('accept'),
      canStartBuild: capabilities.has('start_build'),
      canAssignReviewer: capabilities.has('assign_reviewer'),
      canPlaceModerationHold: capabilities.has('place_moderation_hold'),
      canReleaseModerationHold: capabilities.has('release_moderation_hold'),
      canRemoveForModeration: capabilities.has('remove_for_moderation'),
      canReassignTriager: capabilities.has('reassign_triager'),
      canReassignBuilder: capabilities.has('reassign_builder'),
      canReassignReviewer: capabilities.has('reassign_reviewer'),
    },
    allowedCloseReasons: detail.actor.allowedCloseReasons.filter((reason) => (
      reason !== 'existing_resolution' && reason !== 'duplicate'
    )),
    eligibleBuilders: input.eligibleBuilders ?? [],
    eligibleReviewers: input.eligibleReviewers ?? [],
    eligibleTriagers: input.eligibleTriagers ?? [],
    builderLabel: participant('builder'),
    reviewerLabel: participant('reviewer'),
    targetDate: detail.targetDate,
    idempotencyKeys: {
      existingResolution: stableIntent(detail.requestId, detail.requestVersion, 'existing-resolution'),
      duplicate: stableIntent(detail.requestId, detail.requestVersion, 'duplicate'),
      clarification: stableIntent(detail.requestId, detail.requestVersion, 'clarification'),
      accept: stableIntent(detail.requestId, detail.requestVersion, 'accept'),
      startBuild: stableIntent(detail.requestId, detail.requestVersion, 'start-build'),
      assignReviewer: stableIntent(detail.requestId, detail.requestVersion, 'assign-reviewer'),
      placeModerationHold: stableIntent(detail.requestId, detail.requestVersion, 'place-hold'),
      releaseModerationHold: stableIntent(detail.requestId, detail.requestVersion, 'release-hold'),
      removeForModeration: stableIntent(detail.requestId, detail.requestVersion, 'remove'),
      close: stableIntent(detail.requestId, detail.requestVersion, 'close'),
      beginTriage: stableIntent(detail.requestId, detail.requestVersion, 'begin-triage'),
      reassignTriager: stableIntent(detail.requestId, detail.requestVersion, 'reassign-triager'),
      reassignBuilder: stableIntent(detail.requestId, detail.requestVersion, 'reassign-builder'),
      reassignReviewer: stableIntent(detail.requestId, detail.requestVersion, 'reassign-reviewer'),
    },
    timeline: detail.events.items.map((event) => ({
      eventId: event.eventId,
      label: event.label,
      detail: event.reason,
      actorLabel: event.actor?.displayName ?? event.actorRole,
      occurredAt: event.occurredAt,
    })),
  }
}
