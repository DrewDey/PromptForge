import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import CommunityArtifactSourceReview from '@/components/CommunityArtifactSourceReview'
import { communityProjectStatusLabel, evidenceScopeLabels } from '@/lib/community-project-contract'
import { getCommunityProjectReportsForAdmin, getCommunityProjectSubmissionForAdmin } from '@/lib/data/community-projects'
import AdminCommunityProjectActions from '../AdminCommunityProjectActions'
import AdminCommunityProjectReportActions from '../AdminCommunityProjectReportActions'
import CopySourceReviewUrl from '../CopySourceReviewUrl'

export const dynamic = 'force-dynamic'

export default async function AdminCommunityProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [submission, reports] = await Promise.all([
    getCommunityProjectSubmissionForAdmin(id),
    getCommunityProjectReportsForAdmin(id),
  ])
  if (!submission) notFound()
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/community-projects" className="inline-flex items-center gap-2 text-sm font-bold text-surface-500 hover:text-brand-orange-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Community project queue</Link>
      <header className="mt-5 border-b border-surface-200 pb-7"><div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">{communityProjectStatusLabel(submission.status)} · version {submission.submission_version}</div><h1 className="mt-2 text-4xl font-black text-surface-900">{submission.title}</h1><p className="mt-3 max-w-3xl text-base leading-7 text-surface-600">{submission.summary}</p><p className="mt-3 text-xs text-surface-500">Submitted by {submission.author?.display_name || submission.author?.username || submission.author_id} · {new Date(submission.created_at).toLocaleString()}</p></header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          {submission.artifact_path && <section><h2 className="mb-3 text-xl font-black text-surface-900">Private artifact source</h2><CommunityArtifactSourceReview submissionId={submission.id} title={`${submission.title} private review`} /></section>}
          <section className="border border-surface-200 bg-white p-5"><h2 className="text-xl font-black text-surface-900">Build evidence</h2><p className="mt-1 text-sm text-surface-500">{evidenceScopeLabels[submission.evidence_scope]} · {submission.build_steps.length} checkpoints</p><div className="mt-5 space-y-4">{submission.build_steps.map((step, index) => <article key={index} className="border border-surface-200"><h3 className="bg-surface-900 px-4 py-2 text-sm font-bold text-white">{step.title}</h3><div className="grid gap-4 p-4 sm:grid-cols-2"><div><strong className="text-xs text-brand-orange-ink">Prompt</strong><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-surface-700">{step.prompt}</p></div><div><strong className="text-xs text-brand-blue">Response</strong><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-surface-700">{step.response}</p></div></div></article>)}</div></section>
          {submission.review_checklist && <section className="border border-green-200 bg-green-50 p-5"><h2 className="text-xl font-black text-green-950">Recorded human review</h2><p className="mt-2 text-xs text-green-800">{submission.review_checklist_version} · {submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleString() : 'date unavailable'}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-green-950">{submission.review_notes}</p></section>}
          <section id="reports" className="scroll-mt-24 border border-surface-200 bg-white p-5"><h2 className="text-xl font-black text-surface-900">Reports</h2>{reports.length === 0 ? <p className="mt-2 text-sm text-surface-500">No reports.</p> : <div className="mt-4 space-y-3">{reports.map((report) => <div key={report.id} className="border border-red-200 bg-red-50 p-3 text-sm"><strong className="text-red-950">{report.reason} · {report.status}</strong><p className="mt-1 leading-6 text-red-900">{report.details}</p><p className="mt-1 text-xs text-red-700">{report.reporter_email} · {new Date(report.created_at).toLocaleString()}</p>{report.resolution_notes && <p className="mt-2 border-l-2 border-red-300 pl-2 text-xs leading-5 text-red-900">{report.resolution_notes}</p>}<AdminCommunityProjectReportActions reportId={report.id} status={report.status} /></div>)}</div>}</section>
        </div>
        <aside className="space-y-5">
          <section className="border border-surface-200 bg-white p-5 text-sm"><h2 className="font-black text-surface-900">Review manifest</h2><dl className="mt-4 grid gap-3 text-xs"><div><dt className="font-bold text-surface-500">Provider/model</dt><dd className="mt-1 text-surface-900">{submission.provider} · {submission.model}</dd></div><div><dt className="font-bold text-surface-500">Artifact</dt><dd className="mt-1 break-all font-mono text-surface-900">{submission.artifact_size_bytes} bytes · {submission.artifact_sha256}</dd></div><div><dt className="font-bold text-surface-500">Scanner</dt><dd className="mt-1 text-surface-900">{submission.artifact_scan?.scanner_version} · {submission.artifact_scan?.passed ? 'passed' : 'failed'}</dd></div><div><dt className="font-bold text-surface-500">Relationship</dt><dd className="mt-1 text-surface-900">{submission.submitter_role.replaceAll('_', ' ')}</dd></div><div><dt className="font-bold text-surface-500">Reuse</dt><dd className="mt-1 text-surface-900">{submission.reuse_permission.replaceAll('_', ' ')}</dd></div><div><dt className="font-bold text-surface-500">Consent versions</dt><dd className="mt-1 text-surface-900">{submission.terms_version} · {submission.privacy_version}</dd></div></dl>{submission.source_url && <CopySourceReviewUrl sourceUrl={submission.source_url} />}</section>
          {submission.prompt_id && <Link href={`/prompt/${submission.prompt_id}`} className="inline-flex min-h-11 w-full items-center justify-center border border-green-300 bg-green-50 px-4 py-2 text-sm font-black text-green-900">View public project</Link>}
          <AdminCommunityProjectActions id={submission.id} status={submission.status} needsSourceCheck={submission.source_visibility === 'public'} />
        </aside>
      </div>
    </div>
  )
}
