import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  communityProjectOperatorAlertsConfigured,
  communityProjectReportSeverity,
  sendCommunityProjectOperatorAlert,
} from '@/lib/community-project-alerts'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type ReportAlertRetry = {
  id: string
  prompt_id: string | null
  reason: string
}

const REPORT_ALERT_RETRY_BATCH_LIMIT = 50
const REPORT_ALERT_CONCURRENCY = 10

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization')
  if (!expected || !supplied?.startsWith('Bearer ')) return false
  const token = supplied.slice('Bearer '.length)
  const expectedBytes = Buffer.from(expected)
  const tokenBytes = Buffer.from(token)
  return expectedBytes.length === tokenBytes.length && timingSafeEqual(expectedBytes, tokenBytes)
}

function failed(message: string, status = 500) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}

async function inChunks<T>(
  items: readonly T[],
  size: number,
  work: (item: T) => Promise<void>,
) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(work))
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return failed('Unavailable.', 404)

  const admin = createAdminClient()
  const runId = crypto.randomUUID()
  const { data: acquired, error: leaseError } = await admin.rpc(
    'begin_community_project_report_alert_delivery',
    { run_id: runId, lease_seconds: 55 },
  )
  if (leaseError) return failed('Community project alert recovery could not acquire its lease.')
  if (acquired !== true) {
    return NextResponse.json(
      { ok: true, skipped: 'active_lease', checkedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  }

  const deliveryErrors: string[] = []
  let attempted = 0
  let delivered = 0

  try {
    const { data: batch, error: batchError } = await admin.rpc(
      'get_community_project_report_alert_batch',
      { batch_size: REPORT_ALERT_RETRY_BATCH_LIMIT },
    )
    if (batchError) throw new Error('report_alert_batch_read_failed')

    await inChunks(
      (batch ?? []) as ReportAlertRetry[],
      REPORT_ALERT_CONCURRENCY,
      async (report) => {
        attempted += 1
        const alertDelivered = await sendCommunityProjectOperatorAlert({
          code: 'report_filed',
          severity: communityProjectReportSeverity(report.reason),
          reportId: report.id,
          promptId: report.prompt_id ?? undefined,
        })
        const { error } = await admin.rpc(
          'record_community_project_report_alert_delivery',
          {
            target_report: report.id,
            delivered: alertDelivered,
            failure_code: alertDelivered ? null : 'independent_webhook_delivery_failed',
            correlation: crypto.randomUUID(),
          },
        )
        if (error) deliveryErrors.push(`record:${report.id}`)
        else if (alertDelivered) delivered += 1
        else deliveryErrors.push(`delivery:${report.id}`)
      },
    )

    const [remainingResult, criticalResult] = await Promise.all([
      admin
        .from('community_project_reports')
        .select('created_at', { count: 'exact', head: false })
        .in('status', ['open', 'reviewing'])
        .in('alert_status', ['pending', 'failed'])
        .order('created_at', { ascending: true })
        .limit(1),
      admin
        .from('community_project_reports')
        .select('created_at', { count: 'exact', head: false })
        .in('status', ['open', 'reviewing'])
        .in('alert_status', ['pending', 'failed'])
        .in('reason', ['privacy', 'malware', 'exploitation', 'credentials', 'imminent_harm'])
        .order('created_at', { ascending: true })
        .limit(1),
    ])
    if (remainingResult.error || criticalResult.error) {
      throw new Error('report_alert_backlog_read_failed')
    }

    const remaining = remainingResult.count ?? 0
    const criticalRemaining = criticalResult.count ?? 0
    const endpointsReady = communityProjectOperatorAlertsConfigured()
    const succeeded = endpointsReady && deliveryErrors.length === 0 && remaining === 0
    const metrics = {
      attempted,
      delivered,
      deliveryErrorCount: deliveryErrors.length,
      remaining,
      criticalRemaining,
      oldestUndeliveredAt: remainingResult.data?.[0]?.created_at ?? null,
      oldestCriticalUndeliveredAt: criticalResult.data?.[0]?.created_at ?? null,
      batchLimit: REPORT_ALERT_RETRY_BATCH_LIMIT,
      independentAlertChannels: endpointsReady ? 2 : 0,
    }
    const errorSummary = succeeded
      ? null
      : `delivery_errors=${deliveryErrors.length};remaining=${remaining};critical=${criticalRemaining};channels=${endpointsReady ? 2 : 0}`
    const { error: finishError } = await admin.rpc(
      'finish_community_project_report_alert_delivery',
      {
        run_id: runId,
        succeeded,
        error_summary: errorSummary,
        metrics,
      },
    )
    if (finishError) throw new Error('report_alert_finish_failed')

    return NextResponse.json({
      ok: succeeded,
      deliveryErrors,
      ...metrics,
      checkedAt: new Date().toISOString(),
    }, {
      status: succeeded ? 200 : 503,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    const errorKind = error instanceof Error ? error.message : 'unknown_failure'
    await admin.rpc('finish_community_project_report_alert_delivery', {
      run_id: runId,
      succeeded: false,
      error_summary: errorKind,
      metrics: {
        attempted,
        delivered,
        deliveryErrorCount: deliveryErrors.length,
      },
    })
    console.error('Community project report-alert recovery failed.', { errorKind })
    await sendCommunityProjectOperatorAlert({
      code: 'report_alert_retry_failed',
      severity: 'critical',
      summary: errorKind,
    })
    return failed('Community project report-alert recovery failed closed.')
  }
}
