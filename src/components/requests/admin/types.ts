import type {
  RequestActorRole,
  RequestCloseReason,
  RequestLifecycleState,
  RequestModerationState,
  RequestQueueScope,
} from '@/lib/request-lifecycle'

export type RequestLifecycle = RequestLifecycleState
export type RequestModeration = RequestModerationState
export type {
  RequestActorRole,
  RequestCloseReason,
  RequestQueueScope,
}

export type RequestAvailability =
  | {
      state: 'open'
      activeCount: number
      maxActiveCases: number
      acceptingRequests: true
      assignmentEnabled: true
    }
  | {
      state: 'controls_off'
      activeCount: number
      maxActiveCases: number
      acceptingRequests: false
      assignmentEnabled: boolean
    }
  | {
      state: 'assignment_off'
      activeCount: number
      maxActiveCases: number
      acceptingRequests: boolean
      assignmentEnabled: false
    }
  | {
      state: 'capacity_full'
      activeCount: number
      maxActiveCases: number
      acceptingRequests: boolean
      assignmentEnabled: boolean
    }

export interface RequestQueueRow {
  requestId: string
  detailHref: string
  version: number
  label: string
  lifecycle: RequestLifecycle
  moderation: RequestModeration
  actorRole: RequestActorRole
  nextAction: string
  unread: boolean
  updatedAt: string
  targetDate?: string | null
}

export type RequestQueueModel =
  | { state: 'loading'; scope: RequestQueueScope }
  | {
      state: 'unavailable'
      scope: RequestQueueScope
      message?: string
      retryHref?: string
    }
  | {
      state: 'ready'
      scope: RequestQueueScope
      availability: RequestAvailability
      rows: readonly RequestQueueRow[]
      nextCursor?: string | null
      loadMoreHref?: string
    }

export type RequestFormAction = (
  formData: FormData,
) => void | Promise<void>

export interface RequestAdminCapabilities {
  canBeginTriage: boolean
  canResolveExistingPath: boolean
  canRequestClarification: boolean
  canAcceptAndAssign: boolean
  canStartBuild: boolean
  canAssignReviewer: boolean
  canPlaceModerationHold: boolean
  canReleaseModerationHold: boolean
  canRemoveForModeration: boolean
  canReassignTriager: boolean
  canReassignBuilder: boolean
  canReassignReviewer: boolean
}

export interface RequestAdminActions {
  beginTriage?: RequestFormAction
  resolveExistingPath?: RequestFormAction
  requestClarification?: RequestFormAction
  acceptAndAssign?: RequestFormAction
  startBuild?: RequestFormAction
  assignReviewer?: RequestFormAction
  placeModerationHold?: RequestFormAction
  releaseModerationHold?: RequestFormAction
  removeForModeration?: RequestFormAction
  close?: RequestFormAction
  reassignTriager?: RequestFormAction
  reassignBuilder?: RequestFormAction
  reassignReviewer?: RequestFormAction
}

export interface RequestEligibleAssignee {
  /** Opaque account identity from the admin-only application-service read. */
  accountId: string
  /** Safe display label only; never an email address. */
  displayName: string
}

export interface RequestAuditEvent {
  eventId: string
  label: string
  detail?: string | null
  actorLabel: string
  occurredAt: string
}

export interface RequestAdminDetailModel {
  requestId: string
  version: number
  actorRole: RequestActorRole
  lifecycle: RequestLifecycle
  moderation: RequestModeration
  capabilities: RequestAdminCapabilities
  allowedCloseReasons: readonly RequestCloseReason[]
  eligibleBuilders: readonly RequestEligibleAssignee[]
  eligibleReviewers: readonly RequestEligibleAssignee[]
  eligibleTriagers: readonly RequestEligibleAssignee[]
  builderLabel?: string | null
  reviewerLabel?: string | null
  targetDate?: string | null
  idempotencyKeys: {
    existingResolution: string
    duplicate: string
    clarification: string
    accept: string
    startBuild: string
    assignReviewer: string
    placeModerationHold: string
    releaseModerationHold: string
    removeForModeration: string
    close: string
    beginTriage: string
    reassignTriager: string
    reassignBuilder: string
    reassignReviewer: string
  }
  timeline: readonly RequestAuditEvent[]
}
