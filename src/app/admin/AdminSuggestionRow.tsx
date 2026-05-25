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
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-700',
}

function publicStateLabel(suggestion: SuggestionWithRelations) {
  if (
    suggestion.visibility === 'scheduled_public' &&
    suggestion.scheduled_publish_at &&
    new Date(suggestion.scheduled_publish_at).getTime() <= Date.now()
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

export default function AdminSuggestionRow({ suggestion }: { suggestion: SuggestionWithRelations }) {
  const moderationStatus = moderationStatusForDisplay(suggestion)

  return (
    <div className="border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-semibold ${moderationColors[moderationStatus]}`}>
              {moderationStatus}
            </span>
            <span className="bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {publicStateLabel(suggestion)}
            </span>
            <span className="bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {suggestion.public_status.replace('_', ' ')}
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-950">{suggestion.title}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">{suggestion.body}</p>
          <p className="mt-2 text-xs text-gray-500">
            By {suggestion.author?.display_name ?? suggestion.author?.username ?? 'Unknown user'} · {new Date(suggestion.created_at).toLocaleDateString()}
          </p>
        </div>

        {moderationStatus === 'pending' && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => approveSuggestion(suggestion.id)}
              className="inline-flex items-center gap-1 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => declineSuggestion(suggestion.id)}
              className="inline-flex items-center gap-1 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <XCircle className="h-3.5 w-3.5" />
              Decline
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 lg:grid-cols-[220px_1fr]">
        <form action={updateSuggestionPublicStatus} className="flex flex-col gap-2">
          <input type="hidden" name="suggestion_id" value={suggestion.id} />
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Public status</label>
          <select
            name="public_status"
            defaultValue={suggestion.public_status}
            className="border border-gray-300 bg-white px-2 py-2 text-sm text-gray-800"
          >
            <option value="under_review">Under review</option>
            <option value="planned">Planned</option>
            <option value="shipped">Shipped</option>
            <option value="declined">Declined</option>
          </select>
          <button type="submit" className="bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-orange">
            Update status
          </button>
        </form>

        <form action={respondToSuggestion} className="flex flex-col gap-2">
          <input type="hidden" name="suggestion_id" value={suggestion.id} />
          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <MessageSquare className="h-3.5 w-3.5" />
            Response
          </label>
          <textarea
            name="body"
            rows={3}
            placeholder="Write a response to this suggestion..."
            className="border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed text-gray-800"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <select name="visibility" defaultValue="submitter" className="border border-gray-300 bg-white px-2 py-2 text-xs text-gray-700">
              <option value="submitter">Submitter only</option>
              <option value="public">Public response</option>
            </select>
            <button type="submit" className="bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-orange">
              Send response
            </button>
          </div>
        </form>
      </div>

      {(suggestion.responses ?? []).length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Responses</p>
          <div className="space-y-2">
            {(suggestion.responses ?? []).map((response) => (
              <div key={response.id} className="border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {response.visibility === 'public' ? 'Public' : 'Submitter only'} · {new Date(response.created_at).toLocaleDateString()}
                </div>
                {response.body}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
