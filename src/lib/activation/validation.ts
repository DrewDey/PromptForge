import {
  ACTIVATION_ACTIONS,
  ACTIVATION_EVENT_NAMES,
  ACTIVATION_SCHEMA_VERSION,
  ACTIVATION_SURFACES,
  type ActivationAction,
  type ActivationEventName,
  type ActivationEventPayload,
  type ActivationSurface,
} from './contract'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new Error('Invalid event text field.')
  const normalized = value.trim()
  if (!normalized || normalized.length > maxLength || CONTROL_CHARACTERS.test(normalized)) {
    throw new Error('Invalid event text field.')
  }
  return normalized
}

function enumValue<T extends string>(value: unknown, values: readonly T[]) {
  if (value === undefined || value === null || value === '') return undefined
  return typeof value === 'string' && values.includes(value as T) ? value as T : null
}

export function validateActivationEventPayload(value: unknown): ActivationEventPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid event payload.')
  }

  const body = value as Record<string, unknown>
  if (typeof body.eventId !== 'string' || !UUID_PATTERN.test(body.eventId)) {
    throw new Error('Invalid event id.')
  }
  if (typeof body.eventName !== 'string' || !ACTIVATION_EVENT_NAMES.includes(body.eventName as ActivationEventName)) {
    throw new Error('Invalid event name.')
  }
  if (body.schemaVersion !== ACTIVATION_SCHEMA_VERSION) {
    throw new Error('Unsupported event schema.')
  }

  const path = optionalText(body.path, 240)
  if (
    !path ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#')
  ) {
    throw new Error('Invalid event path.')
  }

  const surface = enumValue(body.surface, ACTIVATION_SURFACES)
  const action = enumValue(body.action, ACTIVATION_ACTIONS)
  if (surface === null || action === null) throw new Error('Invalid event classification.')

  const metricValue = body.metricValue === undefined || body.metricValue === null
    ? undefined
    : body.metricValue
  if (metricValue !== undefined && (!Number.isInteger(metricValue) || Number(metricValue) < 0 || Number(metricValue) > 10000)) {
    throw new Error('Invalid event metric.')
  }

  const payload: ActivationEventPayload = {
    eventId: body.eventId,
    eventName: body.eventName as ActivationEventName,
    path,
    surface: surface as ActivationSurface | undefined,
    action: action as ActivationAction | undefined,
    projectId: optionalText(body.projectId, 200),
    projectTitle: optionalText(body.projectTitle, 180),
    sourceRunId: optionalText(body.sourceRunId, 200),
    metricValue: metricValue as number | undefined,
    schemaVersion: ACTIVATION_SCHEMA_VERSION,
  }

  if (payload.eventName.startsWith('discovery_') && !payload.surface) {
    throw new Error('Discovery events require a surface.')
  }
  if (['project_opened', 'build_path_reached', 'artifact_opened', 'model_run_compared'].includes(payload.eventName) && !payload.projectId) {
    throw new Error('Project events require a project id.')
  }
  if (payload.eventName === 'builder_action_started' && !['fork', 'share'].includes(payload.action ?? '')) {
    throw new Error('Builder actions require a fork or share action.')
  }
  if (['source_run_submitted', 'community_project_submitted'].includes(payload.eventName) && !['fork', 'share'].includes(payload.action ?? '')) {
    throw new Error('Project submissions require a fork or share action.')
  }
  if (
    [
      'intake_started',
      'submitted',
      'intake_failed',
      'status_viewed',
      'clarification_submitted',
      'delivery_opened',
      'usefulness_recorded',
    ].includes(payload.eventName)
  ) {
    const canonicalRequestPaths = [
      '/requests/new',
      '/requests/[id]',
      '/my-forge',
      '/admin/build-requests/[id]',
    ]
    if (!canonicalRequestPaths.includes(payload.path)) {
      throw new Error('Request analytics require a canonical private-safe path.')
    }
    if (!['requests', 'my_forge'].includes(payload.surface ?? '')) {
      throw new Error('Request analytics require a Request-owned surface.')
    }
    if (payload.projectId || payload.projectTitle || payload.sourceRunId) {
      throw new Error('Request analytics cannot include private identifiers.')
    }
  }
  if (
    payload.eventName === 'intake_failed' &&
    ![
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
    ].includes(payload.action ?? '')
  ) {
    throw new Error('Request intake failures require a bounded reason.')
  }
  if (
    payload.eventName === 'status_viewed' &&
    ![
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
    ].includes(payload.action ?? '')
  ) {
    throw new Error('Request status views require a bounded lifecycle stage.')
  }
  if (
    payload.eventName === 'usefulness_recorded' &&
    !['helpful', 'not_helpful'].includes(payload.action ?? '')
  ) {
    throw new Error('Request usefulness requires a bounded outcome.')
  }

  return payload
}
