'use client'

import { useActionState } from 'react'
import { Send } from 'lucide-react'
import { submitSuggestion, type SuggestionSubmitState } from '@/lib/actions'

const initialState: SuggestionSubmitState = { error: null }

export default function SuggestionSubmitForm() {
  const [state, formAction, pending] = useActionState(submitSuggestion, initialState)

  return (
    <form action={formAction} className="border border-brand-blue/30 bg-white shadow-[10px_10px_0_rgba(59,143,228,0.12)]">
      <div className="border-b border-accent-100 bg-accent-50 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-blue-dark">
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          Private suggestion
        </div>
        <p className="mt-2 text-sm leading-6 text-surface-600">
          Send one focused site improvement, bug, or confusion point.
        </p>
      </div>

      <div className="p-5 sm:p-6">
      <div className="mb-5">
        <label htmlFor="suggestion-title" className="block text-xs font-bold uppercase tracking-[0.14em] text-surface-500 mb-2">
          Suggestion title
        </label>
        <input
          id="suggestion-title"
          name="title"
          required
          minLength={4}
          maxLength={160}
          placeholder="Example: Make the fork button easier to find"
          className="w-full border border-surface-300 bg-white px-3 py-3 text-sm font-medium text-surface-900 placeholder:text-surface-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
        />
      </div>

      <div className="mb-5">
        <label htmlFor="suggestion-body" className="block text-xs font-bold uppercase tracking-[0.14em] text-surface-500 mb-2">
          What should PathForge do with it?
        </label>
        <textarea
          id="suggestion-body"
          name="body"
          required
          minLength={12}
          maxLength={5000}
          rows={7}
          placeholder="Describe the site feedback, bug, confusing page, moderation concern, or feature that would make PathForge better."
          className="w-full border border-surface-300 bg-white px-3 py-3 text-sm leading-relaxed text-surface-900 placeholder:text-surface-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
        />
      </div>

      {state.error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 bg-brand-blue px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {pending ? 'Sending...' : 'Send suggestion'}
      </button>
      </div>
    </form>
  )
}
