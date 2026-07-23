import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type {
  CommunityProjectReportQueue,
  CommunityProjectReportQueueFilters,
} from '@/lib/data/community-projects'

export default function AdminCommunityProjectReportQueue({
  queue,
  filters,
}: {
  queue: CommunityProjectReportQueue
  filters: CommunityProjectReportQueueFilters
}) {
  const reportFilterActive = Boolean(filters.reason || filters.alert || filters.query || filters.cursor)
  if (queue.totalCount === 0 && !reportFilterActive) return null

  const nextReportParams = new URLSearchParams()
  if (filters.reason) nextReportParams.set('report_reason', filters.reason)
  if (filters.alert) nextReportParams.set('report_alert', filters.alert)
  if (filters.query) nextReportParams.set('report_query', filters.query)
  if (queue.nextCursor) nextReportParams.set('report_cursor', queue.nextCursor)
  const nextReportHref = queue.nextCursor
    ? `/admin/community-projects?${nextReportParams.toString()}#open-safety-reports`
    : null

  return (
    <section
      id="open-safety-reports"
      data-community-report-queue
      data-total-count={queue.totalCount}
      data-filtered-count={queue.filteredCount}
      className="mt-7 scroll-mt-24"
      aria-labelledby="open-report-title"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="open-report-title" className="text-lg font-black text-red-950">Open safety reports</h2>
          <p className="mt-1 text-xs text-surface-500">Critical reasons are first, then the oldest reports. Every row has its own review URL.</p>
        </div>
        <div className="text-right text-xs font-bold text-surface-600">
          <div>{queue.totalCount} open · {queue.criticalCount} critical · {queue.undeliveredCount} alerts pending</div>
          <div className="mt-1 font-normal text-surface-500">
            {queue.oldestCriticalAt ? `Oldest critical ${new Date(queue.oldestCriticalAt).toLocaleString()}. ` : ''}
            {queue.oldestUndeliveredAt ? `Oldest undelivered ${new Date(queue.oldestUndeliveredAt).toLocaleString()}.` : ''}
          </div>
        </div>
      </div>
      <form action="/admin/community-projects" method="get" className="mb-3 grid gap-2 border border-surface-200 bg-surface-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end">
        <label className="grid gap-1 text-xs font-bold text-surface-700">
          Search report, project, prompt, email, or details
          <input name="report_query" defaultValue={filters.query || ''} maxLength={120} className="min-h-11 border border-surface-300 bg-white px-3 text-sm font-normal text-surface-900" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-surface-700">
          Reason
          <select name="report_reason" defaultValue={filters.reason || ''} className="min-h-11 border border-surface-300 bg-white px-3 text-sm font-normal text-surface-900">
            <option value="">All reasons</option>
            <option value="privacy">Privacy</option>
            <option value="malware">Malware</option>
            <option value="exploitation">Exploitation</option>
            <option value="credentials">Credentials</option>
            <option value="imminent_harm">Imminent harm</option>
            <option value="copyright">Copyright</option>
            <option value="abuse">Abuse</option>
            <option value="misleading">Misleading</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-surface-700">
          Alert
          <select name="report_alert" defaultValue={filters.alert || ''} className="min-h-11 border border-surface-300 bg-white px-3 text-sm font-normal text-surface-900">
            <option value="">All alert states</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="delivered">Delivered</option>
          </select>
        </label>
        <button className="min-h-11 bg-surface-900 px-4 py-2 text-sm font-black text-white">Filter queue</button>
      </form>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-surface-500">
        <span>Showing {queue.reports.length} of {queue.filteredCount} matching reports.</span>
        {reportFilterActive && <Link href="/admin/community-projects#open-safety-reports" className="font-bold text-surface-700 underline">Reset queue</Link>}
      </div>
      {queue.reports.length === 0 ? (
        <div className="border border-surface-200 bg-white p-6 text-sm text-surface-500">No open reports match these filters.</div>
      ) : (
        <div className="grid gap-2">
          {queue.reports.map((report) => (
            <Link key={report.id} href={`/admin/community-project-reports/${report.id}`} className="grid gap-2 border border-red-200 bg-red-50 p-3 text-sm hover:border-red-500 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span><strong className="text-red-950">{report.reason} · {report.status} · alert {report.alert_status}</strong><span className="mt-1 block line-clamp-2 text-xs leading-5 text-red-900">{report.details}</span><span className="mt-1 block break-all font-mono text-[10px] text-red-700">Report {report.id}</span></span>
              <span className="inline-flex items-center gap-2 text-xs font-black text-red-900">Review report <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      )}
      {nextReportHref && (
        <div className="mt-3 flex justify-end">
          <Link href={nextReportHref} className="inline-flex min-h-11 items-center gap-2 border border-surface-900 bg-white px-4 py-2 text-sm font-black text-surface-900">Next 25 reports <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      )}
    </section>
  )
}
