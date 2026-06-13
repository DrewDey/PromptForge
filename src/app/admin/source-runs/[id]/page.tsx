import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, ExternalLink, GitBranch, Paperclip } from 'lucide-react'
import { dismissSourceRun, publishPreparedShowcaseSourceRun } from '@/lib/actions'
import { getSourceRunSubmissionForAdmin } from '@/lib/data'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import { projectForkSourceFromSubmissionFields } from '@/lib/project-forks'
import { agentNotesForSourceRunReview, modelMetadataForSourceRunReview, titleForSourceRunReview } from '@/lib/source-run-review'

export const dynamic = 'force-dynamic'

const sourceRunAttachmentBucket = 'source-run-attachments'

function sourceRunAttachmentLabel(fileName: string) {
  return fileName.split('/').pop() || fileName
}

function isImageAttachment(fileName: string) {
  return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(fileName)
}

async function getSourceRunAttachmentSignedUrl(fileName: string | null) {
  if (!fileName) return null

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(sourceRunAttachmentBucket)
    .createSignedUrl(fileName, 60 * 60)

  if (error) return null

  return data.signedUrl
}

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
  const modelMetadata = modelMetadataForSourceRunReview({
    notes: sourceRun.notes,
    sourceUrl: sourceRun.source_url,
  })
  const forkSource = projectForkSourceFromSubmissionFields(sourceRun)
  const agentNotes = agentNotesForSourceRunReview(sourceRun.notes, { hideForkMetadata: Boolean(forkSource) })
  const author = sourceRun.author?.display_name ?? sourceRun.author?.username ?? 'Anonymous'
  const sourceLabel = sourceRun.source_url ?? sourceRun.file_name ?? 'No source attached'
  const attachmentUrl = await getSourceRunAttachmentSignedUrl(sourceRun.file_name)
  const preparedProject = getPreparedShowcaseProjectBySourceRunId(sourceRun.id)
  const linkedPromptStatus = sourceRun.extracted_prompt?.status ?? null
  const isPublished = sourceRun.extracted_prompt?.status === 'approved'
  const isDeclined = sourceRun.status === 'failed' || linkedPromptStatus === 'rejected'
  const isPreparedPending = Boolean(sourceRun.extracted_prompt_id) && !isPublished && !isDeclined
  const publishedHref = isPublished && sourceRun.extracted_prompt_id
    ? preparedProject?.href ?? `/prompt/${sourceRun.extracted_prompt_id}`
    : null
  const reviewStatusLabel = isPublished
    ? 'Published source run'
    : isDeclined
      ? linkedPromptStatus === 'rejected'
        ? 'Rejected source-run page'
        : 'Declined source run'
      : isPreparedPending
        ? 'Prepared page pending approval'
        : sourceRun.status === 'extracting'
          ? 'Extracting source run'
          : 'Pending source-run review'
  const reviewStatusClass = isPublished
    ? 'bg-green-100 text-green-800'
    : isDeclined
      ? 'bg-red-100 text-red-800'
      : 'bg-amber-100 text-amber-800'

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin?tab=pending" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-orange">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to review queue
      </Link>

      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-5">
          <div className={`mb-2 inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${reviewStatusClass}`}>
            {reviewStatusLabel}
          </div>
          <h1 className="text-2xl font-bold text-gray-950">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Submitted by {author} on {new Date(sourceRun.created_at).toLocaleString()}.
          </p>
        </div>

        <div className="grid gap-5 p-6">
          <section className="border border-blue-200 bg-blue-50 p-4">
            <h2 className="text-sm font-bold text-blue-950">How this gets approved</h2>
            <p className="mt-1 text-sm leading-6 text-blue-900">
              {isDeclined
                ? 'This source-run review is closed. It should stay out of Build Paths unless an admin explicitly reopens or republishes it later.'
                : 'This is the captured AI-session intake. It becomes public only after a prepared showcase page exists and an admin publishes that prepared page from here. Until then it stays out of Build Paths.'}
            </p>
            {preparedProject ? (
              <p className="mt-2 text-sm font-semibold text-blue-950">
                Prepared route ready: {preparedProject.href}. Next action: publish this prepared page from the review item.
              </p>
            ) : (
              <p className="mt-2 text-sm font-semibold text-blue-950">
                No prepared page is wired for this source run yet. Next action: structure a prepared public page, then return here to publish or decline it.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Model captured</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-gray-200 bg-gray-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Provider</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {modelMetadata.provider || 'Not specified'}
                </div>
              </div>
              <div className="border border-gray-200 bg-gray-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Model used</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {modelMetadata.modelUsed || 'Not specified'}
                </div>
              </div>
              <div className="border border-gray-200 bg-gray-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Model settings</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {modelMetadata.modelSettings || 'Not specified'}
                </div>
              </div>
            </div>
          </section>

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

          {sourceRun.file_name && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Review attachment</h2>
              <div className="border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
                    <Paperclip className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden="true" />
                    <span className="truncate">{sourceRunAttachmentLabel(sourceRun.file_name)}</span>
                  </div>
                  {attachmentUrl ? (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:border-brand-orange hover:text-brand-orange"
                    >
                      Open attachment
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-sm text-red-700">Signed link unavailable</span>
                  )}
                </div>
                {attachmentUrl && isImageAttachment(sourceRun.file_name) && (
                  <img
                    src={attachmentUrl}
                    alt={sourceRunAttachmentLabel(sourceRun.file_name)}
                    className="mt-4 max-h-80 w-full border border-gray-200 bg-white object-contain"
                  />
                )}
              </div>
            </section>
          )}

          {forkSource && (
            <section className="border border-green-200 bg-green-50 p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-green-950">
                <GitBranch className="h-4 w-4" aria-hidden="true" />
                Fork source
              </h2>
              <p className="mt-1 text-sm leading-6 text-green-900">
                This intake starts from {forkSource.sourceProjectTitle || forkSource.sourceProjectId}
                {forkSource.sourceStepNumber ? ` at response package ${String(forkSource.sourceStepNumber).padStart(2, '0')}` : ''}.
              </p>
              <div className="mt-3 grid gap-2 text-xs text-green-950 sm:grid-cols-2">
                <div className="border border-green-200 bg-white px-3 py-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-green-700">Source project</div>
                  <div className="mt-1 break-all font-semibold">{forkSource.sourceProjectId}</div>
                </div>
                <div className="border border-green-200 bg-white px-3 py-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-green-700">Fork point</div>
                  <div className="mt-1 break-all font-semibold">
                    {forkSource.sourceStepId || (forkSource.sourceStepNumber ? `response ${forkSource.sourceStepNumber}` : 'Default response')}
                  </div>
                </div>
                <div className="border border-green-200 bg-white px-3 py-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-green-700">Prompt family</div>
                  <div className="mt-1 break-all font-semibold">{forkSource.promptFamilyId || 'Not specified'}</div>
                </div>
                <div className="border border-green-200 bg-white px-3 py-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-green-700">Coordinates</div>
                  <div className="mt-1 font-semibold">
                    Depth {forkSource.depth + 1} / 10 · Branch {forkSource.branchIndex + 1} / 10
                  </div>
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Agent notes</h2>
            <div className="min-h-24 whitespace-pre-wrap border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800">
              {agentNotes || 'No notes supplied.'}
            </div>
          </section>

          {isDeclined && (
            <section className="border border-red-200 bg-red-50 p-4">
              <h2 className="text-sm font-bold text-red-900">Review closed</h2>
              <p className="mt-1 text-sm leading-6 text-red-800">
                This intake is no longer waiting for approval.
                {sourceRun.admin_notes ? ` ${sourceRun.admin_notes}` : ''}
              </p>
            </section>
          )}

          {publishedHref ? (
            <section className="border border-green-200 bg-green-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-green-900">
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Public page published
                  </h2>
                  <p className="mt-1 text-sm text-green-800">
                    This intake has been connected to an approved public project page.
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
          ) : preparedProject && !isDeclined ? (
            <section className="border border-green-200 bg-green-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-green-900">
                    {sourceRun.extracted_prompt_id ? 'Prepared public page needs approval' : 'Prepared public page ready'}
                  </h2>
                  <p className="mt-1 text-sm text-green-800">
                    The artifact has been extracted and mounted in the PathForge showcase format. Publishing here
                    creates or updates the approved project page and removes this intake from Pending Review.
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
                    {sourceRun.extracted_prompt_id ? 'Approve prepared page' : 'Publish public page'}
                  </button>
                </form>
              </div>
            </section>
          ) : null}

          {!isPublished && !isDeclined && (
            <section className="border border-red-200 bg-red-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-red-900">Decline this intake</h2>
                  <p className="mt-1 text-sm text-red-800">
                    Use this if the source run should not become a public PathForge page.
                  </p>
                </div>
                <form action={dismissSourceRun}>
                  <input type="hidden" name="source_run_id" value={sourceRun.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 hover:border-red-500"
                  >
                    Decline intake
                  </button>
                </form>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
