'use client'

import { CheckCircle, MessageSquare, XCircle } from 'lucide-react'
import type { SuggestionWithRelations } from '@/lib/types'
import {
  approveSuggestion,
  declineSuggestion,
  respondToSuggestion,
  updateSuggestionPublicStatus,
} from '@/lib/actions'

const moderationColors: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  approved: 'border-green-200 bg-green-50 text-green-800',
  declined: 'border-red-200 bg-red-50 text-red-800',
}

function publicStateLabel(suggestion: SuggestionWithRelations, nowMs: number) {
  if (
    suggestion.visibility === 'scheduled_public' &&
    suggestion.scheduled_publish_at &&
    new Date(suggestion.scheduled_publish_at).getTime() <= nowMs
  ) {
    return 'Public board'
  }
  if (suggestion.visibility === 'scheduled_public' && suggestion.scheduled_publish_at) {
    return `Public after ${new Date(suggestion.scheduled_publish_at).toLocaleString()}`
  }
  if (suggestion.visibility === 'private') return 'Private thread'
  return 'Public board'
}

function moderationStatusForDisplay(suggestion: SuggestionWithRelations) {
  if (suggestion.moderation_status === 'pending' && suggestion.public_status !== 'under_review') {
    return suggestion.public_status === 'declined' ? 'declined' : 'approved'
  }

  return suggestion.moderation_status
}

export default function AdminSuggestionRow({
  suggestion,
  nowMs,
}: {
  suggestion: SuggestionWithRelations
  nowMs: number
}) {
  const moderationStatus = moderationStatusForDisplay(suggestion)
  const publicStatusId = `suggestion-${suggestion.id}-public-status`
  const responseId = `suggestion-${suggestion.id}-response`
  const visibilityId = `suggestion-${suggestion.id}-visibility`

  return (
    <article className="min-w-0 border border-surface-200 bg-white p-4 shadow-[4px_4px_0_rgba(24,24,27,0.035)] sm:p-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <span className={`border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${moderationColors[moderationStatus] ?? 'border-surface-200 bg-surface-50 text-surface-600'}`}>
              {moderationStatus}
            </span>
            <span className="border border-surface-200 bg-surface-50 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-surface-600">
              {publicStateLabel(suggestion, nowMs)}
            </span>
            <span className="border border-surface-200 bg-white px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-surface-500">
              {suggestion.public_status.replace('_', ' ')}
            </span>
          </div>
          <h3 className="break-words text-lg font-black leading-6 text-surface-900">{suggestion.title}</h3>
          <p className="mt-2 max-w-4xl whitespace-pre-wrap break-words text-sm leading-6 text-surface-600">{suggestion.body}</p>
          <p className="mt-3 font-mono text-[10px] leading-5 text-surface-500">
            By {suggestion.author?.display_name ?? suggestion.author?.username ?? 'Unknown user'} · {new Date(suggestion.created_at).toLocaleDateString()}
          </p>
        </div>

        {moderationStatus === 'pending' && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-surface-200 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <button
              type="button"
              onClick={() => approveSuggestion(suggestion.id)}
              className="inline-flex min-h-10 items-center gap-1.5 bg-green-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            >
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => declineSuggestion(suggestion.id)}
              className="inline-flex min-h-10 items-center gap-1.5 border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Decline
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 grid min-w-0 gap-5 border-t border-surface-200 pt-5 xl:grid-cols-[minmax(230px,0.36fr)_minmax(0,1fr)]">
        <form action={updateSuggestionPublicStatus} className="min-w-0 border border-surface-200 bg-surface-50 p-4">
          <input type="hidden" name="suggestion_id" value={suggestion.id} />
          <label htmlFor={publicStatusId} className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
            Public status
          </label>
          <select
            id={publicStatusId}
            name="public_status"
            defaultValue={suggestion.public_status}
            className="mt-2 min-h-11 w-full min-w-0 border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
          >
            <option value="under_review">Under review</option>
            <option value="planned">Planned</option>
            <option value="shipped">Shipped</option>
            <option value="declined">Declined</option>
          </select>
          <button
            type="submit"
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center bg-surface-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            Update status
          </button>
        </form>

        <form action={respondToSuggestion} className="min-w-0 border border-surface-200 bg-white p-4">
          <input type="hidden" name="suggestion_id" value={suggestion.id} />
          <label htmlFor={responseId} className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Response
          </label>
          <textarea
            id={responseId}
            name="body"
            rows={3}
            placeholder="Write a response to this suggestion..."
            className="mt-2 w-full min-w-0 resize-y border border-surface-300 bg-white px-3 py-2.5 text-sm leading-6 text-surface-900 outline-none transition-colors placeholder:text-surface-400 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
          />
          <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor={visibilityId} className="sr-only">Response visibility</label>
            <select
              id={visibilityId}
              name="visibility"
              defaultValue="submitter"
              className="min-h-10 min-w-0 border border-surface-300 bg-white px-3 py-2 text-xs text-surface-700 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
            >
              <option value="submitter">Submitter only</option>
              <option value="public">Public response</option>
            </select>
            <button
              type="submit"
              className="inline-flex min-h-10 shrink-0 items-center justify-center bg-surface-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              Send response
            </button>
          </div>
        </form>
      </div>

      {(suggestion.responses ?? []).length > 0 && (
        <div className="mt-5 min-w-0 border-t border-surface-200 pt-4">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">Responses</p>
          <div className="min-w-0 space-y-2">
            {(suggestion.responses ?? []).map(response => (
              <div key={response.id} className="min-w-0 border border-surface-200 bg-surface-50 p-3 text-sm leading-6 text-surface-700">
                <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-surface-500">
                  {response.visibility === 'public' ? 'Public' : 'Submitter only'} · {new Date(response.created_at).toLocaleDateString()}
                </div>
                <p className="whitespace-pre-wrap break-words">{response.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
