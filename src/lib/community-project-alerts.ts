type CommunityProjectAlert = {
  code:
    | 'report_filed'
    | 'operator_readiness_probe'
    | 'reconciliation_attention'
    | 'reconciliation_failed'
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

function operatorAlertEndpoint() {
  const rawUrl = process.env.COMMUNITY_PROJECT_ALERT_WEBHOOK_URL?.trim()
  if (!rawUrl) return null
  try {
    const endpoint = new URL(rawUrl)
    return endpoint.protocol === 'https:' ? endpoint : null
  } catch {
    return null
  }
}

export function communityProjectOperatorAlertsConfigured() {
  return operatorAlertEndpoint() !== null
}

export function communityProjectReportSeverity(reason: string): CommunityProjectAlert['severity'] {
  return CRITICAL_REPORT_REASONS.has(reason) ? 'critical' : 'warning'
}

export async function sendCommunityProjectOperatorAlert(alert: CommunityProjectAlert) {
  const endpoint = operatorAlertEndpoint()
  if (!endpoint) {
    console.error('Community project operator alert is not configured.', {
      code: alert.code,
      severity: alert.severity,
    })
    return false
  }

  for (let attempt = 1; attempt <= ALERT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'pathforge-community-projects',
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
          code: alert.code,
          status: response.status,
          attempts: attempt,
        })
        return false
      }
    } catch {
      if (attempt === ALERT_MAX_ATTEMPTS) {
        console.error('Community project operator alert delivery failed.', {
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
