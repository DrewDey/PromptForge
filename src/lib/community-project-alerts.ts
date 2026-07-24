type CommunityProjectAlert = {
  code:
    | 'report_filed'
    | 'operator_readiness_probe'
    | 'reconciliation_attention'
    | 'reconciliation_failed'
    | 'report_alert_retry_failed'
  severity: 'warning' | 'critical'
  submissionId?: string
  promptId?: string
  reportId?: string
  summary?: string
}

const ALERT_TIMEOUT_MS = 3_000
const ALERT_MAX_ATTEMPTS = 2
const CRITICAL_REPORT_REASONS = new Set([
  'privacy',
  'malware',
  'exploitation',
  'credentials',
  'imminent_harm',
])

type OperatorAlertChannel = 'primary' | 'escalation'

function parseOperatorAlertEndpoint(rawUrl: string | undefined) {
  const normalizedUrl = rawUrl?.trim()
  if (!normalizedUrl) return null
  try {
    const endpoint = new URL(normalizedUrl)
    return endpoint.protocol === 'https:' ? endpoint : null
  } catch {
    return null
  }
}

function operatorAlertEndpoints() {
  const primary = parseOperatorAlertEndpoint(
    process.env.COMMUNITY_PROJECT_ALERT_WEBHOOK_URL,
  )
  const escalation = parseOperatorAlertEndpoint(
    process.env.COMMUNITY_PROJECT_ALERT_ESCALATION_WEBHOOK_URL,
  )
  if (!primary || !escalation || primary.href === escalation.href) return null
  return [
    { channel: 'primary' as const, endpoint: primary },
    { channel: 'escalation' as const, endpoint: escalation },
  ]
}

async function deliverOperatorAlert(
  channel: OperatorAlertChannel,
  endpoint: URL,
  alert: CommunityProjectAlert,
) {
  for (let attempt = 1; attempt <= ALERT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'pathforge-community-projects',
          channel,
          occurredAt: new Date().toISOString(),
          ...alert,
        }),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
      })
      if (response.ok) return true
      const retryable = response.status === 408
        || response.status === 429
        || response.status >= 500
      if (!retryable || attempt === ALERT_MAX_ATTEMPTS) {
        console.error('Community project operator alert delivery failed.', {
          channel,
          code: alert.code,
          status: response.status,
          attempts: attempt,
        })
        return false
      }
    } catch {
      if (attempt === ALERT_MAX_ATTEMPTS) {
        console.error('Community project operator alert delivery failed.', {
          channel,
          code: alert.code,
          attempts: attempt,
        })
        return false
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
  }
  return false
}

export function communityProjectOperatorAlertsConfigured() {
  return operatorAlertEndpoints() !== null
}

export function communityProjectReportSeverity(reason: string): CommunityProjectAlert['severity'] {
  return CRITICAL_REPORT_REASONS.has(reason) ? 'critical' : 'warning'
}

export async function sendCommunityProjectOperatorAlert(alert: CommunityProjectAlert) {
  const endpoints = operatorAlertEndpoints()
  if (!endpoints) {
    console.error('Independent community project operator alerts are not configured.', {
      code: alert.code,
      severity: alert.severity,
    })
    return false
  }

  const results = await Promise.all(
    endpoints.map(({ channel, endpoint }) => (
      deliverOperatorAlert(channel, endpoint, alert)
    )),
  )
  return results.every(Boolean)
}
