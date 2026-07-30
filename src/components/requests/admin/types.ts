export type RequestQueueScope = 'admin' | 'triager' | 'builder' | 'reviewer'

export type RequestActorRole =
  | 'requester'
  | 'triager'
  | 'builder'
  | 'reviewer'
  | 'system'

export type RequestLifecycle =
  | 'submitted'
  | 'triage'
  | 'clarification_requested'
  | 'accepted'
  | 'building'
  | 'review_pending'
  | 'repair_required'
  | 'delivery_ready'
  | 'delivered'
  | 'completed'
  | 'closed'

export type RequestModeration = 'clear' | 'held' | 'removed'

export type RequestCloseReason =
  | 'existing_resolution'
  | 'duplicate'
  | 'out_of_scope'
  | 'capacity_unavailable'
  | 'declined'
  | 'withdrawn'
  | 'expired'
  | 'failed_review'
  | 'safety_removed'
  | 'no_response'

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
  canResolveExistingPath: boolean
  canRequestClarification: boolean
  canAcceptAndAssign: boolean
  canStartBuild: boolean
  canAssignReviewer: boolean
  canModerate: boolean
  canClose: boolean
}

export interface RequestAdminActions {
  resolveExistingPath?: RequestFormAction
  requestClarification?: RequestFormAction
  acceptAndAssign?: RequestFormAction
  startBuild?: RequestFormAction
  assignReviewer?: RequestFormAction
  moderate?: RequestFormAction
  close?: RequestFormAction
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
  builderLabel?: string | null
  builderUserId?: string | null
  reviewerLabel?: string | null
  reviewerUserId?: string | null
  targetDate?: string | null
  idempotencyKeys: {
    existingResolution: string
    duplicate: string
    clarification: string
    accept: string
    startBuild: string
    assignReviewer: string
    moderation: string
    close: string
  }
  timeline: readonly RequestAuditEvent[]
}
