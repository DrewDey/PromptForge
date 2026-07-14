'use client'

import { useActionState } from 'react'
import { respondToBuildRequest, type BuildRequestResponseState } from '@/lib/actions'

const initialState: BuildRequestResponseState = { error: null }

export default function BuildRequestResponseForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(respondToBuildRequest, initialState)

  return (
    <form action={formAction} className="mt-5 border-t border-surface-100 pt-4">
      <input type="hidden" name="request_id" value={requestId} />
      <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
        <label htmlFor={`build-request-url-${requestId}`} className="sr-only">
          Link to a PathForge build or fork
        </label>
        <input
          id={`build-request-url-${requestId}`}
          name="url"
          type="url"
          maxLength={500}
          placeholder="PathForge project or fork URL"
          className="border border-surface-300 bg-white px-3 py-2.5 text-base text-surface-900 placeholder:text-surface-600 focus:border-brand-orange-ink focus:outline-none sm:text-sm"
        />
        <label htmlFor={`build-request-note-${requestId}`} className="sr-only">
          Short note about what you made
        </label>
        <input
          id={`build-request-note-${requestId}`}
          name="body"
          maxLength={5000}
          placeholder="Short note about what you made"
          className="border border-surface-300 bg-white px-3 py-2.5 text-base text-surface-900 placeholder:text-surface-600 focus:border-brand-orange-ink focus:outline-none sm:text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-surface-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? 'Responding…' : 'Respond'}
        </button>
      </div>
      {state.error && (
        <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.success && !state.error && (
        <p className="mt-3 text-sm font-medium text-emerald-700" role="status">Response added.</p>
      )}
    </form>
  )
}
