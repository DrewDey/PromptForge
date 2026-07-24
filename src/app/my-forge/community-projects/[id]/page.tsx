import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import CommunityArtifactSourceReview from '@/components/CommunityArtifactSourceReview'
import { communityProjectStatusLabel, evidenceScopeLabels } from '@/lib/community-project-contract'
import { getCommunityProjectSubmissionForOwner } from '@/lib/data/community-projects'
import OwnerCommunityProjectActions from '../OwnerCommunityProjectActions'

export const dynamic = 'force-dynamic'

export default async function OwnerCommunityProjectDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ submitted?: string }>
}) {
  const { id } = await params
  const submission = await getCommunityProjectSubmissionForOwner(id)
  if (!submission) notFound()

  const { submitted } = await searchParams
  return (
    <main className="bg-surface-50 pb-16">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link href="/my-forge/community-projects" className="inline-flex items-center gap-2 text-sm font-bold text-surface-500">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My project submissions
        </Link>
        {submitted === '1' && submission.status === 'queued' && (
          <div role="status" className="mt-5 border border-green-300 bg-green-50 p-4 text-sm text-green-900">
            <strong>Private bundle received.</strong> It is not public and is waiting for review.
          </div>
        )}
        <header className="mt-6 border-b border-surface-200 pb-7">
          <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
            {communityProjectStatusLabel(submission.status)} · version {submission.submission_version}
          </div>
          <h1 className="mt-2 text-4xl font-black text-surface-900">{submission.title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-surface-600">{submission.summary}</p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {submission.artifact_path ? (
              <>
                <h2 className="mb-3 text-xl font-black text-surface-900">Your private artifact source</h2>
                <CommunityArtifactSourceReview submissionId={submission.id} title={`${submission.title} private artifact`} />
              </>
            ) : (
              <div className="border border-surface-200 bg-white p-6 text-sm text-surface-500">
                The artifact has been purged.
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <section className="border border-surface-200 bg-white p-5">
              <h2 className="font-black text-surface-900">Review status</h2>
              <p className="mt-2 text-sm leading-6 text-surface-600">
                {submission.user_status_note || (submission.status === 'queued'
                  ? 'Waiting for a reviewer. No public project exists yet.'
                  : 'Open this record for its current state.')}
              </p>
              <dl className="mt-4 grid gap-2 text-xs">
                <div><dt className="font-bold text-surface-500">Evidence</dt><dd>{evidenceScopeLabels[submission.evidence_scope]}</dd></div>
                <div><dt className="font-bold text-surface-500">Source link</dt><dd>{submission.source_url ? (submission.source_visibility === 'public' ? 'Requested public after check' : 'Review only') : 'Not supplied'}</dd></div>
                <div><dt className="font-bold text-surface-500">Reuse</dt><dd>{submission.reuse_permission.replaceAll('_', ' ')}</dd></div>
              </dl>
            </section>
            {submission.status === 'needs_repair' && (
              <Link href={`/build?repairCommunity=${submission.id}`} className="inline-flex min-h-11 w-full items-center justify-center bg-brand-orange px-4 py-2 text-sm font-black text-surface-900">
                Replace bundle
              </Link>
            )}
            {submission.status === 'published' && submission.prompt_id && (
              <Link href={`/prompt/${submission.prompt_id}`} className="inline-flex min-h-11 w-full items-center justify-center border border-green-300 bg-green-50 px-4 py-2 text-sm font-black text-green-900">
                View public project
              </Link>
            )}
            {!['withdrawn', 'removed'].includes(submission.status) && (
              <OwnerCommunityProjectActions id={submission.id} status={submission.status} />
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
