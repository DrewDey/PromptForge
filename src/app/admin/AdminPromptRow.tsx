'use client'

import Link from 'next/link'
import { ArrowUpRight, CheckCircle, XCircle } from 'lucide-react'
import type { PromptWithRelations } from '@/lib/types'
import { approvePrompt, rejectPrompt } from '@/lib/actions'
import { cleanGeneratedProjectTitle } from '@/lib/source-run-review'

const statusColors: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  approved: 'border-green-200 bg-green-50 text-green-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
}

export default function AdminPromptRow({
  prompt,
  showStatus,
  sourceRunHref,
}: {
  prompt: PromptWithRelations
  showStatus?: boolean
  sourceRunHref?: string
}) {
  const title = prompt.status === 'pending'
    ? cleanGeneratedProjectTitle(prompt.title)
    : prompt.title
  const isSourceRunTagged = prompt.tags?.some(tag => tag.trim().toLowerCase() === 'source-run') ?? false
  const isCommunityProject = prompt.tags?.some(tag => tag.trim().toLowerCase() === 'community-project') ?? false
  const hasMissingSourceRunLink = isSourceRunTagged && !sourceRunHref
  const requiresSourceRunReview = Boolean(sourceRunHref) || isSourceRunTagged
  const requiresSpecialReview = requiresSourceRunReview || isCommunityProject
  const detailHref = isCommunityProject ? '/admin/community-projects' : sourceRunHref ?? `/prompt/${prompt.id}`
  const author = prompt.author?.display_name ?? 'Anonymous'

  return (
    <article className="min-w-0 p-4 transition-colors hover:bg-surface-50 sm:p-5">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            {showStatus ? (
              <span className={`border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${statusColors[prompt.status] ?? 'border-surface-200 bg-surface-50 text-surface-600'}`}>
                {prompt.status}
              </span>
            ) : (
              <span className="border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-amber-800">
                Project review
              </span>
            )}
            {requiresSourceRunReview && (
              <span className={`border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${hasMissingSourceRunLink ? 'border-red-200 bg-red-50 text-red-800' : 'border-brand-blue/25 bg-blue-50 text-brand-blue-dark'}`}>
                {hasMissingSourceRunLink ? 'Source-run link missing' : 'Source run attached'}
              </span>
            )}
            {isCommunityProject && (
              <span className="border border-green-200 bg-green-50 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-green-800">
                Community workflow only
              </span>
            )}
          </div>

          {hasMissingSourceRunLink ? (
            <div className="block break-words text-base font-black leading-6 text-surface-900">
              {title}
            </div>
          ) : (
            <Link
              href={detailHref}
              className="block break-words text-base font-black leading-6 text-surface-900 transition-colors hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
            >
              {title}
            </Link>
          )}
          <p className="mt-1 line-clamp-2 max-w-4xl text-sm leading-6 text-surface-600">{prompt.description}</p>

          <dl className="mt-3 flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-xs text-surface-600">
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-surface-400">Category</dt>
              <dd className="truncate font-semibold text-surface-700">{prompt.category?.icon} {prompt.category?.name ?? 'Uncategorized'}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-surface-400">
                {showStatus ? 'Votes' : 'Difficulty'}
              </dt>
              <dd className="font-semibold text-surface-700">{showStatus ? prompt.vote_count : prompt.difficulty}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-surface-400">Author</dt>
              <dd className="truncate font-semibold text-surface-700">{author}</dd>
            </div>
            {!showStatus && (
              <div className="flex items-center gap-1.5">
                <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-surface-400">Submitted</dt>
                <dd className="font-semibold text-surface-700">{new Date(prompt.created_at).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-surface-200 pt-4 lg:max-w-xs lg:justify-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {hasMissingSourceRunLink ? (
            <span className="inline-flex min-h-10 items-center justify-center border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
              Source-run link missing
            </span>
          ) : (
            <Link
              href={detailHref}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 border border-surface-300 bg-white px-3 py-2 text-xs font-bold text-surface-700 transition-colors hover:border-brand-orange-ink hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
            >
              {isCommunityProject ? 'Open community queue' : sourceRunHref ? 'Review source run' : 'View'}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}

          {prompt.status === 'pending' ? (
            <>
              {!requiresSpecialReview && (
                <button
                  type="button"
                  onClick={() => approvePrompt(prompt.id)}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 bg-green-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                >
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Approve
                </button>
              )}
              {!isCommunityProject && (
                <button
                  type="button"
                  onClick={() => rejectPrompt(prompt.id)}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Reject
                </button>
              )}
            </>
          ) : prompt.status === 'approved' && !requiresSpecialReview ? (
            <button
              type="button"
              onClick={() => rejectPrompt(prompt.id)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Unpublish
            </button>
          ) : prompt.status === 'rejected' && !requiresSpecialReview ? (
            <button
              type="button"
              onClick={() => approvePrompt(prompt.id)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 bg-green-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            >
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Publish
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
