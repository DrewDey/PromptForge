import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react'
import { publishPreparedShowcaseSourceRun } from '@/lib/actions'
import { getSourceRunSubmissionForAdmin } from '@/lib/data'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
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
  const preparedProject = getPreparedShowcaseProjectBySourceRunId(sourceRun.id)
  const publishedHref = sourceRun.extracted_prompt_id
    ? preparedProject?.href ?? `/prompt/${sourceRun.extracted_prompt_id}`
    : null

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin?tab=pending" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-orange">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to review queue
      </Link>

      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="mb-2 inline-flex items-center bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
            {sourceRun.extracted_prompt_id ? 'Published source run' : 'Pending source-run review'}
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

          {publishedHref ? (
            <section className="border border-green-200 bg-green-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-green-900">
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Public page published
                  </h2>
                  <p className="mt-1 text-sm text-green-800">
                    This intake has been connected to the public project page.
                  </p>
                </div>
                <Link
                  href={publishedHref}
                  className="inline-flex items-center justify-center gap-2 border border-green-300 bg-white px-3 py-2 text-sm font-semibold text-green-900 hover:border-green-500"
                >
                  View public page
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </section>
          ) : preparedProject ? (
            <section className="border border-green-200 bg-green-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-green-900">Prepared public page ready</h2>
                  <p className="mt-1 text-sm text-green-800">
                    The artifact has been extracted and mounted in the PathForge showcase format.
                  </p>
                </div>
                <form action={publishPreparedShowcaseSourceRun}>
                  <input type="hidden" name="source_run_id" value={sourceRun.id} />
                  <input type="hidden" name="project_id" value={preparedProject.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Publish prepared page
                  </button>
                </form>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
