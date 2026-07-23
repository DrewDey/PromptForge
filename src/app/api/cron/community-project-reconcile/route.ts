import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  COMMUNITY_PROJECT_BUCKET,
  COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES,
} from '@/lib/community-project-contract'
import {
  communityProjectReportSeverity,
  sendCommunityProjectOperatorAlert,
} from '@/lib/community-project-alerts'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type CleanupCandidate = { submission_id: string; artifact_path: string }
type StorageOrphan = { artifact_path: string; created_at: string }
type PublicationDrift = { submission_id: string; issue: string }
type PublishedArtifact = {
  id: string
  artifact_path: string
  artifact_sha256: string
  artifact_size_bytes: number
}
type ReportAlertRetry = {
  id: string
  prompt_id: string | null
  reason: string
}
type RetentionMetrics = {
  reportsPurged?: number
  promptTombstonesDeidentified?: number
  promptStepsPurged?: number
  submissionTombstonesPurged?: number
}

const INTEGRITY_BATCH_LIMIT = 20
const STORAGE_CONCURRENCY = 4
const REPORT_ALERT_RETRY_BATCH_LIMIT = 6
const REPORT_ALERT_CONCURRENCY = 3

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
    'begin_community_project_reconciliation',
    { run_id: runId, lease_seconds: 55 },
  )
  if (leaseError) return failed('Community project reconciliation could not acquire its lease.')
  if (acquired !== true) {
    return NextResponse.json(
      { ok: true, skipped: 'active_lease', checkedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  }

  const cleanupErrors: string[] = []
  const integrityErrors: string[] = []
  const reportAlertErrors: string[] = []
  let finalized = 0
  let orphansRemoved = 0
  let integrityVerified = 0
  let integrityRemoved = 0
  let reportAlertsRetried = 0
  let reportAlertsDelivered = 0

  try {
    const [cleanupResult, orphanResult, artifactResult] = await Promise.all([
      admin.rpc('community_project_cleanup_candidates'),
      admin.rpc('community_project_storage_orphans'),
      admin
        .from('community_project_submissions')
        .select('id,artifact_path,artifact_sha256,artifact_size_bytes')
        .eq('status', 'published')
        .not('artifact_path', 'is', null)
        .order('artifact_integrity_checked_at', { ascending: true, nullsFirst: true })
        .limit(INTEGRITY_BATCH_LIMIT),
    ])
    if (cleanupResult.error || orphanResult.error || artifactResult.error) {
      throw new Error('control_plane_read_failed')
    }

    await inChunks(
      (cleanupResult.data ?? []) as CleanupCandidate[],
      STORAGE_CONCURRENCY,
      async (candidate) => {
        const { error: removeError } = await admin.storage
          .from(COMMUNITY_PROJECT_BUCKET)
          .remove([candidate.artifact_path])
        if (removeError) {
          cleanupErrors.push(`remove:${candidate.submission_id}`)
          return
        }
        const { error: finalizeError } = await admin.rpc(
          'finalize_community_project_artifact_cleanup',
          { target_submission: candidate.submission_id, correlation: crypto.randomUUID() },
        )
        if (finalizeError) cleanupErrors.push(`finalize:${candidate.submission_id}`)
        else finalized += 1
      },
    )

    const orphanCutoff = Date.now() - 24 * 60 * 60 * 1000
    const staleOrphans = ((orphanResult.data ?? []) as StorageOrphan[]).filter((object) => (
      Number.isFinite(Date.parse(object.created_at)) && Date.parse(object.created_at) < orphanCutoff
    ))
    await inChunks(staleOrphans, STORAGE_CONCURRENCY, async (orphan) => {
      const { error } = await admin.storage
        .from(COMMUNITY_PROJECT_BUCKET)
        .remove([orphan.artifact_path])
      if (error) cleanupErrors.push(`orphan:${orphan.artifact_path}`)
      else orphansRemoved += 1
    })

    await inChunks(
      (artifactResult.data ?? []) as PublishedArtifact[],
      STORAGE_CONCURRENCY,
      async (artifact) => {
        const { data, error } = await admin.storage
          .from(COMMUNITY_PROJECT_BUCKET)
          .download(artifact.artifact_path)
        if (error || !data || data.size < 1 || data.size > COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES) {
          integrityErrors.push(`download:${artifact.id}`)
          return
        }
        const bytes = new Uint8Array(await data.arrayBuffer())
        const actualSha256 = createHash('sha256').update(bytes).digest('hex')
        const { data: result, error: recordError } = await admin.rpc(
          'record_community_project_artifact_integrity',
          {
            target_submission: artifact.id,
            actual_sha256: actualSha256,
            actual_size_bytes: bytes.byteLength,
            correlation: crypto.randomUUID(),
          },
        )
        if (recordError) integrityErrors.push(`record:${artifact.id}`)
        else if (result === 'removed') integrityRemoved += 1
        else if (result === 'verified') integrityVerified += 1
      },
    )

    const { data: initialDrift, error: initialDriftError } = await admin.rpc(
      'community_project_publication_drift',
    )
    if (initialDriftError) throw new Error('publication_drift_read_failed')
    for (const drift of (initialDrift ?? []) as PublicationDrift[]) {
      if (drift.issue !== 'published_artifact_missing') continue
      const { error } = await admin.rpc('record_community_project_artifact_integrity', {
        target_submission: drift.submission_id,
        actual_sha256: '0'.repeat(64),
        actual_size_bytes: 0,
        correlation: crypto.randomUUID(),
      })
      if (error) integrityErrors.push(`missing:${drift.submission_id}`)
      else integrityRemoved += 1
    }

    const { data: retentionData, error: retentionError } = await admin.rpc(
      'purge_community_project_retention',
    )
    if (retentionError) throw new Error('retention_purge_failed')
    const retention = (retentionData ?? {}) as RetentionMetrics

    const { data: reportAlertRetries, error: reportAlertRetryError } = await admin
      .from('community_project_reports')
      .select('id,prompt_id,reason')
      .in('status', ['open', 'reviewing'])
      .in('alert_status', ['pending', 'failed'])
      .order('alert_last_attempt_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(REPORT_ALERT_RETRY_BATCH_LIMIT)
    if (reportAlertRetryError) throw new Error('report_alert_retry_read_failed')

    await inChunks(
      (reportAlertRetries ?? []) as ReportAlertRetry[],
      REPORT_ALERT_CONCURRENCY,
      async (report) => {
        reportAlertsRetried += 1
        const correlation = crypto.randomUUID()
        const delivered = await sendCommunityProjectOperatorAlert({
          code: 'report_filed',
          severity: communityProjectReportSeverity(report.reason),
          reportId: report.id,
          promptId: report.prompt_id ?? undefined,
        })
        const { error: recordError } = await admin.rpc(
          'record_community_project_report_alert_delivery',
          {
            target_report: report.id,
            delivered,
            failure_code: delivered ? null : 'webhook_delivery_failed',
            correlation,
          },
        )
        if (recordError) reportAlertErrors.push(`record:${report.id}`)
        else if (delivered) reportAlertsDelivered += 1
        else reportAlertErrors.push(`delivery:${report.id}`)
      },
    )

    const [
      { data: drift, error: driftError },
      reportCountResult,
      undeliveredReportAlertResult,
    ] = await Promise.all([
      admin.rpc('community_project_publication_drift'),
      admin
        .from('community_project_reports')
        .select('created_at', { count: 'exact', head: false })
        .in('status', ['open', 'reviewing'])
        .order('created_at', { ascending: true })
        .limit(1),
      admin
        .from('community_project_reports')
        .select('created_at', { count: 'exact', head: false })
        .in('status', ['open', 'reviewing'])
        .in('alert_status', ['pending', 'failed'])
        .order('created_at', { ascending: true })
        .limit(1),
    ])
    if (driftError || reportCountResult.error || undeliveredReportAlertResult.error) {
      throw new Error('health_read_failed')
    }

    const baseHealthy = (
      (drift?.length ?? 0) === 0
      && cleanupErrors.length === 0
      && integrityErrors.length === 0
      && integrityRemoved === 0
      && reportAlertErrors.length === 0
      && (undeliveredReportAlertResult.count ?? 0) === 0
    )
    let operatorAlertReadiness: 'verified' | 'failed' | 'not_checked' = 'not_checked'
    let readinessError: string | null = null
    if (baseHealthy) {
      const reportSecret = process.env.REPORT_RATE_LIMIT_SECRET
      const cronSecret = process.env.CRON_SECRET
      if (
        !reportSecret
        || reportSecret.length < 32
        || !cronSecret
        || cronSecret.length < 32
      ) {
        operatorAlertReadiness = 'failed'
        readinessError = 'readiness_secrets_unavailable'
      } else {
        const correlation = crypto.randomUUID()
        const delivered = await sendCommunityProjectOperatorAlert({
          code: 'operator_readiness_probe',
          severity: 'warning',
          summary: 'Daily community-project operator notification readiness probe.',
        })
        if (!delivered) {
          operatorAlertReadiness = 'failed'
          readinessError = 'operator_alert_readiness_failed'
        } else {
          const proofHash = createHmac('sha256', reportSecret)
            .update(`community-project-report-readiness:reconciliation:${runId}:${correlation}`)
            .digest('hex')
          const alertProofHash = createHmac('sha256', cronSecret)
            .update(`community-project-alert-readiness:reconciliation:${runId}:${correlation}`)
            .digest('hex')
          const { error: readinessRecordError } = await admin.rpc(
            'record_community_project_report_readiness',
            {
              proof_hash: proofHash,
              alert_proof_hash: alertProofHash,
              correlation,
            },
          )
          if (readinessRecordError) {
            operatorAlertReadiness = 'failed'
            readinessError = 'operator_alert_readiness_receipt_failed'
          } else {
            operatorAlertReadiness = 'verified'
          }
        }
      }
    }

    const metrics = {
      driftCount: drift?.length ?? 0,
      cleanupErrorCount: cleanupErrors.length,
      integrityErrorCount: integrityErrors.length,
      integrityRemoved,
      integrityVerified,
      finalized,
      orphansRemoved,
      openReportCount: reportCountResult.count ?? 0,
      oldestOpenReportAt: reportCountResult.data?.[0]?.created_at ?? null,
      reportAlertsRetried,
      reportAlertsDelivered,
      reportAlertErrorCount: reportAlertErrors.length,
      undeliveredReportAlertCount: undeliveredReportAlertResult.count ?? 0,
      oldestUndeliveredReportAlertAt: undeliveredReportAlertResult.data?.[0]?.created_at ?? null,
      operatorAlertReadiness,
      reportsPurged: retention.reportsPurged ?? 0,
      promptTombstonesDeidentified: retention.promptTombstonesDeidentified ?? 0,
      promptStepsPurged: retention.promptStepsPurged ?? 0,
      submissionTombstonesPurged: retention.submissionTombstonesPurged ?? 0,
    }
    const succeeded = baseHealthy && operatorAlertReadiness === 'verified'
    const errorSummary = succeeded
      ? null
      : `drift=${metrics.driftCount};cleanup=${cleanupErrors.length};integrity=${integrityErrors.length};removed=${integrityRemoved};report_alerts=${reportAlertErrors.length};undelivered=${metrics.undeliveredReportAlertCount};readiness=${readinessError ?? operatorAlertReadiness}`
    const { error: finishError } = await admin.rpc('finish_community_project_reconciliation', {
      run_id: runId,
      succeeded,
      error_summary: errorSummary,
      metrics,
    })
    if (finishError) throw new Error('reconciliation_finish_failed')

    if (!succeeded) {
      console.error('Community project reconciliation requires operator attention.', metrics)
      if (operatorAlertReadiness !== 'failed' && reportAlertErrors.length === 0) {
        await sendCommunityProjectOperatorAlert({
          code: 'reconciliation_attention',
          severity: 'critical',
          summary: errorSummary ?? 'Reconciliation returned a failed health result.',
        })
      }
    }
    return NextResponse.json({
      ok: succeeded,
      drift,
      cleanupErrors,
      integrityErrors,
      reportAlertErrors,
      ...metrics,
      checkedAt: new Date().toISOString(),
    }, {
      status: succeeded ? 200 : 500,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    const errorKind = error instanceof Error ? error.message : 'unknown_failure'
    await admin.rpc('finish_community_project_reconciliation', {
      run_id: runId,
      succeeded: false,
      error_summary: errorKind,
      metrics: {
        cleanupErrors,
        integrityErrors,
        reportAlertErrors,
        reportAlertsRetried,
        reportAlertsDelivered,
        finalized,
        orphansRemoved,
      },
    })
    console.error('Community project reconciliation failed.', { errorKind })
    await sendCommunityProjectOperatorAlert({
      code: 'reconciliation_failed',
      severity: 'critical',
      summary: errorKind,
    })
    return failed('Community project reconciliation failed closed.')
  }
}
