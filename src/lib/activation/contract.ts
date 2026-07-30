export const ACTIVATION_SCHEMA_VERSION = 1 as const

export const ACTIVATION_EVENT_NAMES = [
  'discovery_viewed',
  'discovery_searched',
  'project_opened',
  'build_path_reached',
  'artifact_opened',
  'model_run_compared',
  'builder_action_started',
  'account_created',
  'source_run_submitted',
  'community_project_submitted',
  'my_forge_returned',
  'intake_started',
  'submitted',
  'intake_failed',
  'status_viewed',
  'clarification_submitted',
  'delivery_opened',
  'usefulness_recorded',
] as const

export const ACTIVATION_SURFACES = [
  'home',
  'explore',
  'ideas',
  'requests',
  'guide',
  'project',
  'build',
  'signup',
  'my_forge',
] as const

export const ACTIVATION_ACTIONS = [
  'search',
  'fork',
  'share',
  'email',
  'artifact',
  'model_compare',
  'client_validation',
  'auth_required',
  'controls_closed',
  'capacity_full',
  'rate_limited',
  'duplicate',
  'stale_version',
  'forbidden_input',
  'invalid_reference',
  'service_unavailable',
  'unknown',
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
  'helpful',
  'not_helpful',
] as const

export type ActivationEventName = typeof ACTIVATION_EVENT_NAMES[number]
export type ActivationSurface = typeof ACTIVATION_SURFACES[number]
export type ActivationAction = typeof ACTIVATION_ACTIONS[number]
export type ActivationEnvironment = 'production' | 'preview' | 'development'
export type ActivationActorType = 'anonymous' | 'member' | 'seed' | 'team' | 'admin'

export type ActivationEventInput = {
  eventId?: string
  eventName: ActivationEventName
  path?: string
  surface?: ActivationSurface
  action?: ActivationAction
  projectId?: string
  projectTitle?: string
  sourceRunId?: string
  metricValue?: number
  dedupeKey?: string
}

export type ActivationEventPayload = {
  eventId: string
  eventName: ActivationEventName
  path: string
  surface?: ActivationSurface
  action?: ActivationAction
  projectId?: string
  projectTitle?: string
  sourceRunId?: string
  metricValue?: number
  schemaVersion: typeof ACTIVATION_SCHEMA_VERSION
}

export type ActivationFunnelStep = {
  key: 'project_opened' | 'build_path_reached' | 'builder_action_started' | 'submission_completed'
  label: string
  sessions: number
  rate_from_previous: number
}

export type ActivationDashboardData = {
  window: {
    days: number
    environment: ActivationEnvironment
    started_at: string
    ended_at: string
  }
  summary: {
    project_sessions: number
    evidence_sessions: number
    activated_sessions: number
    completed_sessions: number
    activation_rate: number
    evidence_rate: number
    completion_rate: number
    member_builders: number
    returning_builders: number
    return_rate: number
    account_sessions: number
  }
  funnel: ActivationFunnelStep[]
  supporting: {
    discovery_sessions: number
    search_sessions: number
    artifact_sessions: number
    comparison_sessions: number
  }
  daily: Array<{
    date: string
    project_sessions: number
    evidence_sessions: number
    activated_sessions: number
    completed_sessions: number
  }>
  projects: Array<{
    project_id: string | null
    project_title: string
    path: string
    opens: number
    evidence: number
    activated: number
    completed: number
    activation_rate: number
  }>
  surfaces: Array<{
    surface: string
    project_sessions: number
    evidence_sessions: number
    activated_sessions: number
    activation_rate: number
  }>
  health: {
    total_events: number
    external_events: number
    internal_events: number
    external_sessions: number
    last_event_at: string | null
  }
}
