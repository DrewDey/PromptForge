import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import {
  getCommunityProjectReportForAdmin,
  getCommunityProjectSubmissionForAdmin,
} from '@/lib/data/community-projects'
import AdminCommunityProjectReportActions from '../../community-projects/AdminCommunityProjectReportActions'

export const dynamic = 'force-dynamic'

export default async function AdminCommunityProjectReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound()
  }
  const report = await getCommunityProjectReportForAdmin(id)
  if (!report) notFound()
  const submission = await getCommunityProjectSubmissionForAdmin(report.submission_id)
  if (!submission) notFound()

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/community-projects#open-safety-reports" className="inline-flex items-center gap-2 text-sm font-bold text-surface-500 hover:text-brand-orange-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Moderation queue</Link>
      <header className="mt-5 border-b border-surface-200 pb-6">
        <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-red-800">Safety report</div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-surface-900">{report.reason.replaceAll('_', ' ')}</h1>
        <p className="mt-2 break-all font-mono text-xs text-surface-500">{report.id}</p>
      </header>
      <section className="mt-6 border border-red-200 bg-red-50 p-5 text-red-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{report.status} · alert {report.alert_status}</strong>
          <span className="text-xs">{new Date(report.created_at).toLocaleString()}</span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{report.details}</p>
        <dl className="mt-4 grid gap-2 border-t border-red-200 pt-4 text-xs sm:grid-cols-2">
          <div><dt className="font-black">Reporter</dt><dd className="mt-1 break-all">{report.reporter_email}</dd></div>
          <div><dt className="font-black">Alert delivery</dt><dd className="mt-1">{report.alert_attempt_count} cycle{report.alert_attempt_count === 1 ? '' : 's'}{report.alert_last_attempt_at ? ` · last ${new Date(report.alert_last_attempt_at).toLocaleString()}` : ''}</dd></div>
          <div><dt className="font-black">Project record</dt><dd className="mt-1 break-all">{submission.id}</dd></div>
          <div><dt className="font-black">Public prompt</dt><dd className="mt-1 break-all">{report.prompt_id || 'Unavailable'}</dd></div>
        </dl>
        {report.resolution_notes && <p className="mt-4 border-l-2 border-red-400 pl-3 text-sm leading-6">{report.resolution_notes}</p>}
        <AdminCommunityProjectReportActions reportId={report.id} status={report.status} />
      </section>
      <Link href={`/admin/community-projects/${submission.id}#reports`} className="mt-4 inline-flex min-h-11 items-center gap-2 border border-surface-300 bg-white px-4 py-2 text-sm font-black text-surface-900">Open {submission.title} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
  )
}
