type CommunityProjectAlert = {
  code: 'report_filed' | 'reconciliation_attention' | 'reconciliation_failed'
  severity: 'warning' | 'critical'
  submissionId?: string
  promptId?: string
  reportId?: string
  summary?: string
}

const ALERT_TIMEOUT_MS = 4_000

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

export async function sendCommunityProjectOperatorAlert(alert: CommunityProjectAlert) {
  const endpoint = operatorAlertEndpoint()
  if (!endpoint) {
    console.error('Community project operator alert is not configured.', {
      code: alert.code,
      severity: alert.severity,
    })
    return false
  }

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
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    })
    if (!response.ok) {
      console.error('Community project operator alert delivery failed.', {
        code: alert.code,
        status: response.status,
      })
      return false
    }
    return true
  } catch {
    console.error('Community project operator alert delivery failed.', { code: alert.code })
    return false
  }
}
