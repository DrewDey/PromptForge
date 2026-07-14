'use client'

import { useActionState } from 'react'
import { Send } from 'lucide-react'
import { submitBuildRequest, type BuildRequestSubmitState } from '@/lib/actions'

const initialState: BuildRequestSubmitState = { error: null }

export default function BuildRequestSubmitForm() {
  const [state, formAction, pending] = useActionState(submitBuildRequest, initialState)

  return (
    <form action={formAction} className="border border-surface-200 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <label htmlFor="request-title" className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-surface-500">
          Build request
        </label>
        <input
          id="request-title"
          name="title"
          required
          minLength={4}
          maxLength={160}
          placeholder="Example: A one-file Tetris game I can fork"
          className="w-full border border-surface-300 bg-white px-3 py-3 text-base font-medium text-surface-900 placeholder:text-surface-600 focus:border-brand-orange-ink focus:outline-none focus:ring-2 focus:ring-brand-orange/15 sm:text-sm"
        />
      </div>

      <div className="mb-5">
        <label htmlFor="request-body" className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-surface-500">
          What should someone build?
        </label>
        <textarea
          id="request-body"
          name="body"
          required
          minLength={20}
          maxLength={5000}
          rows={7}
          placeholder="Describe the artifact you want, the model or platform you care about, and what would count as a good finished result."
          className="w-full border border-surface-300 bg-white px-3 py-3 text-base leading-relaxed text-surface-900 placeholder:text-surface-600 focus:border-brand-orange-ink focus:outline-none focus:ring-2 focus:ring-brand-orange/15 sm:text-sm"
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
        className="inline-flex min-h-11 items-center gap-2 bg-surface-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {pending ? 'Posting...' : 'Post build request'}
      </button>
    </form>
  )
}
