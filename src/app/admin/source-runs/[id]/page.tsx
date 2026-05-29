import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { dismissSourceRun } from '@/lib/actions'
import { getSourceRunSubmissionForAdmin } from '@/lib/data'

export const dynamic = 'force-dynamic'

function titleFromNotes(notes: string | null) {
  const match = notes?.match(/^Title:\s*(.+)$/m)
  return match?.[1]?.trim()
}

export default async function AdminSourceRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sourceRun = await getSourceRunSubmissionForAdmin(id)

  if (!sourceRun) notFound()

  const title = sourceRun.title?.trim() || titleFromNotes(sourceRun.notes) || 'Source-run intake'
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
            Let the agent structure it
          </div>
          <h1 className="text-2xl font-bold text-gray-950">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Submitted by {author} on {new Date(sourceRun.created_at).toLocaleString()}.
          </p>
        </div>

        <div className="grid gap-5 p-6">
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Source run</h2>
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
              {sourceRun.notes?.trim() || 'No notes supplied.'}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Status</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{sourceRun.status.replace('_', ' ')}</div>
            </div>
            <div className="border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Author profile</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">
                {sourceRun.author?.username ? (
                  <Link href={`/user/${sourceRun.author.username}`} className="hover:text-brand-orange">
                    /user/{sourceRun.author.username}
                  </Link>
                ) : (
                  author
                )}
              </div>
            </div>
            <div className="border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Draft</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">
                {sourceRun.extracted_prompt_id ? (
                  <Link href={`/prompt/${sourceRun.extracted_prompt_id}`} className="hover:text-brand-orange">
                    View draft
                  </Link>
                ) : (
                  'Not created yet'
                )}
              </div>
            </div>
          </section>

          <section className="border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800">Agent drafting brief</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Open the source run, extract the exact prompts and responses, mount the final artifact first, keep generated
              code inside collapsed response packages, and create the pending project draft under this submitting profile.
            </p>
          </section>

          <form action={dismissSourceRun} className="flex justify-end border-t border-gray-100 pt-4">
            <input type="hidden" name="source_run_id" value={sourceRun.id} />
            <button type="submit" className="bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
              Dismiss intake
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
