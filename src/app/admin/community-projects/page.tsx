import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock3, FileCheck2 } from 'lucide-react'
import { communityProjectStatusLabel } from '@/lib/community-project-contract'
import {
  getCommunityProjectPilotMembersForAdmin,
  getCommunityProjectOperationsForAdmin,
  getCommunityProjectPilotControlsForAdmin,
  getCommunityProjectReportQueueForAdmin,
  getCommunityProjectSubmissionsForAdmin,
} from '@/lib/data/community-projects'
import PilotMembershipForm from './PilotMembershipForm'
import InvitationControlForm from './InvitationControlForm'
import PublicationControlForm from './PublicationControlForm'
import AdminCommunityProjectReportQueue from './AdminCommunityProjectReportQueue'

export const dynamic = 'force-dynamic'

function operationIsStale(lastSuccess: string | null | undefined, maxAgeHours = 26) {
  const timestamp = lastSuccess ? Date.parse(lastSuccess) : Number.NaN
  return !Number.isFinite(timestamp) || Date.now() - timestamp > maxAgeHours * 60 * 60 * 1000
}

function operationMetric(operation: { last_metrics: Record<string, unknown> } | undefined, key: string) {
  const value = operation?.last_metrics?.[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function searchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminCommunityProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const reportFilters = {
    cursor: searchValue(params.report_cursor),
    reason: searchValue(params.report_reason),
    alert: searchValue(params.report_alert),
    query: searchValue(params.report_query),
  }
  const [submissions, reportQueue, members, operations, controls] = await Promise.all([
    getCommunityProjectSubmissionsForAdmin(),
    getCommunityProjectReportQueueForAdmin(reportFilters),
    getCommunityProjectPilotMembersForAdmin(),
    getCommunityProjectOperationsForAdmin(),
    getCommunityProjectPilotControlsForAdmin(),
  ])
  const reconciliation = operations.find((operation) => operation.operation === 'reconciliation')
  const reportReadiness = operations.find((operation) => operation.operation === 'report_intake')
  const reportAlertRecovery = operations.find((operation) => operation.operation === 'report_alerts')
  const invitationReadiness = operations.find((operation) => operation.operation === 'invitation_expansion')
  const undeliveredOpenReportCount = reportQueue.undeliveredCount
  const activeInternalMembers = members.filter((member) => member.is_current && member.member_kind === 'internal_acceptance')
  const activeInvitedMembers = members.filter((member) => member.is_current && member.member_kind === 'invited_builder')
  const activeSubmissions = submissions.filter((submission) => (
    ['queued', 'needs_repair', 'published'].includes(submission.status)
  ))
  const reconciliationStale = operationIsStale(reconciliation?.last_success_at)
  const reportReadinessStale = operationIsStale(reportReadiness?.last_success_at)
  const reportAlertRecoveryStale = operationIsStale(reportAlertRecovery?.last_success_at, 1)
  const reconciliationNeedsAttention = reconciliation?.last_status !== 'succeeded' || reconciliationStale
  const reportAlertDeliveryVerified = operationMetric(reportReadiness, 'operator_alert_delivery') === 'verified'
  const reportReadinessNeedsAttention = (
    reportReadiness?.last_status !== 'succeeded'
    || reportReadinessStale
    || !reportAlertDeliveryVerified
  )
  const reportAlertRecoveryNeedsAttention = (
    reportAlertRecovery?.last_status !== 'succeeded'
    || reportAlertRecoveryStale
    || operationMetric(reportAlertRecovery, 'independentAlertChannels') !== '2'
  )
  const operationsNeedAttention = (
    reconciliationNeedsAttention
    || reportReadinessNeedsAttention
    || reportAlertRecoveryNeedsAttention
    || undeliveredOpenReportCount > 0
  )
  const canAttemptControlEnable = (
    !reconciliationNeedsAttention
    && !reportReadinessNeedsAttention
    && !reportAlertRecoveryNeedsAttention
    && undeliveredOpenReportCount === 0
  )
  const publicationOperationallyReady = controls?.allow_publication === true && !operationsNeedAttention
  const invitationOperationallyReady = controls?.allow_invited_submissions === true && !operationsNeedAttention
  const invitationBlockReason = reconciliationNeedsAttention
    ? 'Run a successful reconciliation before attempting to open the external invitation lane.'
    : reportReadinessNeedsAttention
      ? 'Refresh the report-intake and dual-channel alert proof before opening the external invitation lane.'
      : reportAlertRecoveryNeedsAttention
        ? 'Run and verify the dual-channel report-alert recovery heartbeat before opening the external invitation lane.'
        : undeliveredOpenReportCount > 0
          ? 'Resolve operator-alert delivery for every open report before attempting to open the external invitation lane.'
          : ''
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-surface-500 hover:text-brand-orange-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Admin workspace</Link>
      <header className="mt-5 grid gap-5 border-b border-surface-200 pb-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div><div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">Invitation-only pilot</div><h1 className="mt-2 text-4xl font-black tracking-[-0.035em] text-surface-900">Community project review</h1><p className="mt-2 text-sm leading-6 text-surface-600">Review the exact artifact, evidence scope, consent, source visibility, and scanner record before one atomic publish action.</p></div>
        <div className="flex gap-3"><span className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{submissions.filter((item) => item.status === 'queued').length} queued</span><span className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-900">{reportQueue.totalCount} open reports</span></div>
      </header>
      <section className={`mt-7 border p-4 ${operationsNeedAttention ? 'border-red-300 bg-red-50 text-red-950' : 'border-green-200 bg-green-50 text-green-950'}`} role={operationsNeedAttention ? 'alert' : 'status'}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">Operational readiness health</h2><p className="mt-1 text-xs leading-5">{reconciliation?.last_success_at ? `Last successful reconciliation ${new Date(reconciliation.last_success_at).toLocaleString()}.` : 'No successful reconciliation run has been recorded yet.'} {reportReadiness?.last_success_at ? `Last successful report-intake and dual-channel alert proof ${new Date(reportReadiness.last_success_at).toLocaleString()}.` : 'No successful report-intake and dual-channel alert proof has been recorded yet.'} {reportAlertRecovery?.last_success_at ? `Last successful alert-recovery heartbeat ${new Date(reportAlertRecovery.last_success_at).toLocaleString()}.` : 'No successful alert-recovery heartbeat has been recorded yet.'} {undeliveredOpenReportCount > 0 ? `${undeliveredOpenReportCount} open report alert${undeliveredOpenReportCount === 1 ? ' is' : 's are'} pending delivery.` : ''} {reconciliation?.last_error ? `Latest reconciliation error: ${reconciliation.last_error}` : ''} {reportReadiness?.last_error ? `Latest report-intake error: ${reportReadiness.last_error}` : ''} {reportAlertRecovery?.last_error ? `Latest alert-recovery error: ${reportAlertRecovery.last_error}` : ''}</p></div><span className="font-mono text-[10px] font-black uppercase tracking-[0.14em]">{operationsNeedAttention ? 'Operator action required' : 'Current'}</span></div>
      </section>
      <section className={`mt-4 border p-4 ${publicationOperationallyReady ? 'border-green-200 bg-green-50 text-green-950' : controls?.allow_publication ? 'border-red-300 bg-red-50 text-red-950' : 'border-amber-300 bg-amber-50 text-amber-950'}`} aria-labelledby="publication-control-title">
        <h2 id="publication-control-title" className="font-black">Publication readiness</h2>
        <p className="mt-1 text-xs leading-5">
          Publication is <strong>{controls?.allow_publication ? publicationOperationallyReady ? 'enabled and operationally ready' : 'enabled but blocked by stale or failed readiness' : 'paused'}</strong>. Enabling requires reconciliation within 26 hours, a dual-channel alert proof, an alert-recovery heartbeat within one hour, and no undelivered open-report alerts. Readiness proof: {reportReadiness?.last_success_at ? new Date(reportReadiness.last_success_at).toLocaleString() : 'not yet recorded'}.
        </p>
        {operationsNeedAttention && (
          <p className="mt-2 text-xs font-bold leading-5">
            Required: {[
              reconciliationNeedsAttention ? 'run successful reconciliation' : '',
              reportReadinessNeedsAttention ? 'refresh report-intake and alert-delivery proof' : '',
              reportAlertRecoveryNeedsAttention ? 'restore the dual-channel alert-recovery heartbeat' : '',
              undeliveredOpenReportCount > 0 ? 'deliver pending report alerts' : '',
            ].filter(Boolean).join(' and ')}.
          </p>
        )}
        <PublicationControlForm
          enabled={controls?.allow_publication === true}
          operationallyReady={publicationOperationallyReady}
          canAttemptEnable={canAttemptControlEnable}
        />
      </section>
      <section className="mt-7" aria-labelledby="pilot-access-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="pilot-access-title" className="text-lg font-black text-surface-900">Pilot access</h2><p className="mt-1 text-xs text-surface-500">One expiring owner-operated acceptance account can test the real non-admin flow while the external invited cohort remains <strong>{controls?.allow_invited_submissions ? 'enabled' : 'locked'}</strong>.</p></div>
          <span className="text-xs font-bold text-surface-500">{activeInternalMembers.length}/1 acceptance · {activeInvitedMembers.length}/30 invited · {30 - activeInvitedMembers.length} invitations remaining · {activeSubmissions.length}/50 active submissions</span>
        </div>
        <div className={`mb-3 border p-4 ${invitationOperationallyReady ? 'border-green-200 bg-green-50 text-green-950' : controls?.allow_invited_submissions ? 'border-red-300 bg-red-50 text-red-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
          <strong className="block text-sm">External invitation lane: {controls?.allow_invited_submissions ? invitationOperationallyReady ? 'enabled and operationally ready' : 'enabled but automatically blocked by readiness' : 'locked'}</strong>
          <p className="mt-1 text-xs leading-5">Named membership and submission permission are separate controls. Enabling requires a fresh database gate snapshot and a non-secret reference to the complete private expansion record; it does not enable publication. Last expansion reference: {operationMetric(invitationReadiness, 'private_record_reference') || 'none recorded'}.</p>
          <InvitationControlForm
            enabled={controls?.allow_invited_submissions === true}
            canAttemptEnable={canAttemptControlEnable}
            blockReason={invitationBlockReason}
          />
        </div>
        <PilotMembershipForm externalInvitationsEnabled={controls?.allow_invited_submissions === true} />
        {members.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{members.map((member) => <span key={member.user_id} className={`border px-2.5 py-1.5 text-xs ${member.is_current ? 'border-green-200 bg-green-50 text-green-900' : 'border-surface-200 bg-surface-50 text-surface-500'}`}>@{member.user?.username || member.user_id} · {member.member_kind === 'internal_acceptance' ? 'acceptance' : 'invited'} · {member.is_current ? member.expires_at ? `active until ${new Date(member.expires_at).toLocaleString()}` : 'active' : member.active ? 'expired' : 'revoked'}</span>)}</div>}
      </section>
      <AdminCommunityProjectReportQueue queue={reportQueue} filters={reportFilters} />
      <div className="mt-7 grid gap-3">
        {submissions.length === 0 ? <div className="border border-surface-200 bg-white p-8 text-center text-sm text-surface-500">No pilot submissions yet.</div> : submissions.map((submission) => (
          <Link key={submission.id} href={`/admin/community-projects/${submission.id}`} className="grid gap-4 border border-surface-200 bg-white p-4 hover:border-brand-orange sm:grid-cols-[42px_minmax(0,1fr)_auto] sm:items-center">
            <span className="flex h-10 w-10 items-center justify-center bg-surface-900 text-white">{submission.status === 'published' ? <FileCheck2 className="h-4 w-4" aria-hidden="true" /> : <Clock3 className="h-4 w-4" aria-hidden="true" />}</span>
            <span className="min-w-0"><strong className="block truncate text-sm text-surface-900">{submission.title}</strong><span className="mt-1 block text-xs text-surface-500">{submission.author?.display_name || submission.author?.username || 'Contributor'} · {submission.evidence_scope.replaceAll('_', ' ')} · version {submission.submission_version}</span></span>
            <span className="flex items-center gap-3 text-xs font-bold text-surface-600"><span>{communityProjectStatusLabel(submission.status)}</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </div>
  )
}
