'use client'

import { trackActivationEvent } from '@/lib/activation/track'
import type { ActivationAction, ActivationSurface } from '@/lib/activation/contract'

export const REQUEST_ANALYTICS_EVENT_NAMES = [
  'intake_started',
  'submitted',
  'intake_failed',
  'status_viewed',
  'clarification_submitted',
  'delivery_opened',
  'usefulness_recorded',
] as const

export const REQUEST_ANALYTICS_FAILURE_REASONS = [
  'client_validation',
  'auth_required',
  'not_admitted',
  'controls_closed',
  'capacity_full',
  'rate_limited',
  'duplicate',
  'stale_version',
  'forbidden_input',
  'invalid_reference',
  'service_unavailable',
  'unknown',
] as const

export const REQUEST_ANALYTICS_STAGES = [
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
] as const

export type RequestAnalyticsEventName = typeof REQUEST_ANALYTICS_EVENT_NAMES[number]
export type RequestAnalyticsFailureReason = typeof REQUEST_ANALYTICS_FAILURE_REASONS[number]
export type RequestAnalyticsStage = typeof REQUEST_ANALYTICS_STAGES[number]
export type RequestAnalyticsSurface =
  | 'request_intake'
  | 'request_case'
  | 'my_forge_requests'
  | 'admin_requests'

type IntakeStartedEvent = {
  eventName: 'intake_started'
  surface: 'request_intake'
}

type SubmittedEvent = {
  eventName: 'submitted'
  surface: 'request_intake'
  replayed: boolean
}

type IntakeFailedEvent = {
  eventName: 'intake_failed'
  surface: 'request_intake'
  reason: RequestAnalyticsFailureReason
}

type StatusViewedEvent = {
  eventName: 'status_viewed'
  surface: Exclude<RequestAnalyticsSurface, 'request_intake'>
  stage: RequestAnalyticsStage
}

type ClarificationSubmittedEvent = {
  eventName: 'clarification_submitted'
  surface: 'request_case' | 'admin_requests'
  replayed: boolean
}

type DeliveryOpenedEvent = {
  eventName: 'delivery_opened'
  surface: 'request_case' | 'admin_requests'
}

type UsefulnessRecordedEvent = {
  eventName: 'usefulness_recorded'
  surface: 'request_case'
  usefulness: 'helpful' | 'not_helpful'
  replayed: boolean
}

export type RequestAnalyticsEvent =
  | IntakeStartedEvent
  | SubmittedEvent
  | IntakeFailedEvent
  | StatusViewedEvent
  | ClarificationSubmittedEvent
  | DeliveryOpenedEvent
  | UsefulnessRecordedEvent

function activationClassification(event: RequestAnalyticsEvent): {
  path: '/requests/new' | '/requests/[id]' | '/my-forge' | '/admin/build-requests/[id]'
  surface: ActivationSurface
  action?: ActivationAction
} {
  const path = event.surface === 'request_intake'
    ? '/requests/new'
    : event.surface === 'my_forge_requests'
      ? '/my-forge'
      : event.surface === 'admin_requests'
        ? '/admin/build-requests/[id]'
        : '/requests/[id]'
  const surface: ActivationSurface = event.surface === 'my_forge_requests' ? 'my_forge' : 'requests'

  switch (event.eventName) {
    case 'intake_failed':
      return { path, surface, action: event.reason }
    case 'status_viewed':
      return { path, surface, action: event.stage }
    case 'usefulness_recorded':
      return { path, surface, action: event.usefulness }
    default:
      return { path, surface }
  }
}

/**
 * Best-effort UX diagnostics only. Transactional receipts and audit events
 * remain the authority, so analytics rejection must never block the workflow.
 */
export function trackRequestAnalytics(event: RequestAnalyticsEvent): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  const classification = activationClassification(event)
  return trackActivationEvent({
    eventName: event.eventName,
    path: classification.path,
    surface: classification.surface,
    action: classification.action,
  }).catch(() => false)
}
