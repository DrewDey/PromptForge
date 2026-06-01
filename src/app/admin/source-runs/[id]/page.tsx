import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getSourceRunSubmissionForAdmin } from '@/lib/data'
import { agentNotesForSourceRunReview, titleForSourceRunReview } from '@/lib/source-run-review'

export const dynamic = 'force-dynamic'

export default async function AdminSourceRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sourceRun = await getSourceRunSubmissionForAdmin(id)

  if (!sourceRun) notFound()

  const title = titleForSourceRunReview({
    title: sourceRun.title,
    notes: sourceRun.notes,
  })
  const agentNotes = agentNotesForSourceRunReview(sourceRun.notes)
  const author = sourceRun.author?.display_name ?? sourceRun.author?.username ?? 'Anonymous'
  const sourceLabel = sourceRun.source_url ?? sourceRun.file_name ?? 'No source attached'

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin?tab=pending" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-orange">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to review queue
      </Link>

      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="mb-2 inline-flex items-center bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
            Pending source-run review
          </div>
          <h1 className="text-2xl font-bold text-gray-950">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Submitted by {author} on {new Date(sourceRun.created_at).toLocaleString()}.
          </p>
        </div>

        <div className="grid gap-5 p-6">
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">AI session link</h2>
            {sourceRun.source_url ? (
              <a
                href={sourceRun.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-2 break-all border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 hover:border-brand-orange hover:text-brand-orange"
              >
                {sourceRun.source_url}
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <p className="text-sm text-gray-600">{sourceLabel}</p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Agent notes</h2>
            <div className="min-h-24 whitespace-pre-wrap border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800">
              {agentNotes || 'No notes supplied.'}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
